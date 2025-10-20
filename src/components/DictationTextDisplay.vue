<template>
  <div class="mt-3 mb-5">

    <!-- Mode lecture -->

    <template v-if="!isEditing">
      <p v-if="analysis"
         class="mt-2 dictation-text">
        <template v-for="(seg, i) in segments" :key="i">
          <span v-if="seg.needsSpan" :class="seg.classes" :style="seg.style">{{ seg.text }}</span>
          <template v-else>{{ seg.text }}</template>
        </template>
      </p>
      <p v-else
         class="mt-2 dictation-text">{{ text }}</p>
    </template>

    <!-- Mode édition -->

    <template v-else>
      <textarea v-model="localText"
                rows="10"></textarea>

      <!-- Texte analysé avec overlay si dirty -->

      <div v-if="analysis"
           class="relative"
           :class="{ 'pointer-events-none': isTextDirty }">
        <p class="mt-2 dictation-text"
           :class="{ 'opacity-50 blurred': isTextDirty }"
           @contextmenu.prevent="handleContextMenu">
          <template v-for="(seg, i) in segments" :key="i">
            <span v-if="seg.needsSpan" :class="seg.classes" :style="seg.style">{{ seg.text }}</span>
            <template v-else>{{ seg.text }}</template>
          </template>
        </p>

        <!-- Overlay avec bouton Analyser -->

        <div v-if="isTextDirty"
             class="analysis-overlay absolute flex flex-col items-center inset-0 justify-center pointer-events-auto">
          <button class="action primary analyze"
                  :disabled="isAnalyzing"
                  @click="emit('analyze')">
            {{ isAnalyzing ? 'Analyse en cours…' : 'Analyser' }}
          </button>
          <p v-if="analysisError"
             class="text-sm text-red-600 mt-2">{{ analysisError }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import type { AnalyzeResult } from '../types';
  import type { HighlightToken } from '../composables/useDictationHighlight';

  const props = defineProps<{
    text: string;
    analyzedText: string; // snapshot analysé
    highlightedTokens: HighlightToken[];
    analysis: AnalyzeResult | null;
    isEditing: boolean;
    isTextDirty: boolean;
    isAnalyzing: boolean;
    analysisError: string | null;
    clickedTokenRange: { start: number; end: number } | null;
  }>();

  const emit = defineEmits<{
    'update:text': [value: string];
    analyze: [];
    contextmenu: [event: MouseEvent, container: Element];
  }>();

  const localText = ref(props.text);
  const editableDiv = ref<HTMLDivElement | null>(null);

  // Synchroniser le texte local avec les props (externe)
  watch(() => props.text, newText => {
    localText.value = newText;
    if (editableDiv.value && editableDiv.value.textContent !== newText) {
      editableDiv.value.textContent = newText;
    }
  });

  // Initialiser le contenu au montage
  onMounted(() => {
    if (editableDiv.value) {
      editableDiv.value.textContent = localText.value;
    }
  });

  // S'assurer que le div est initialisé quand on passe en mode édition
  watch(() => props.isEditing, async isEditing => {
    if (isEditing) {
      await nextTick();
      if (editableDiv.value && editableDiv.value.textContent !== localText.value) {
        editableDiv.value.textContent = localText.value;
      }
    }
  });

  watch(localText, newText => {
    emit('update:text', newText);
  });

  function handleContextMenu(e: MouseEvent) {
    const container = (e.target as HTMLElement).closest('.dictation-text');
    if (container) {
      emit('contextmenu', e, container);
    }
  }

  // Reconstruire segments avec interstices (inchangé, dépend des props analysés)

  const segments = computed(() => {
    if (!props.analysis || !props.analyzedText) {
      return [] as HighlightToken[];
    }
    const tokens = props.highlightedTokens;
    const result: HighlightToken[] = [];
    let lastEnd = 0;
    for (const t of tokens) {
      if (t.start > lastEnd) {
        result.push({ start: lastEnd, end: t.start, text: props.analyzedText.substring(lastEnd, t.start), classes: [], needsSpan: false });
      }
      result.push({ ...t });
      lastEnd = t.end;
    }
    if (lastEnd < props.analyzedText.length) {
      result.push({ start: lastEnd, end: props.analyzedText.length, text: props.analyzedText.substring(lastEnd), classes: [], needsSpan: false });
    }

    // Marquer le token cliqué (mise en gras)
    if (props.clickedTokenRange) {
      for (const seg of result) {
        if (seg.start === props.clickedTokenRange.start && seg.end === props.clickedTokenRange.end) {
          if (!seg.classes.includes('font-black')) {
            seg.classes = [...seg.classes, 'font-black'];
          }
          seg.needsSpan = true; // garantir un span pour appliquer la classe
          break;
        }
      }
    }
    return result;
  });
</script>


<style scoped>
  .dictation-text.blurred {
    filter: blur(2px);
  }
</style>
