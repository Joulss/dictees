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
                rows="4"
                @input="onInput"></textarea>

      <!-- Texte analysé avec overlay si dirty -->
      <div v-if="analysis"
           class="analyzed-text-container"
           :class="{ 'is-dirty': isTextDirty }">
        <p class="mt-2 dictation-text"
           :class="{ 'blurred': isTextDirty }"
           @contextmenu.prevent="handleContextMenu">
          <template v-for="(seg, i) in segments" :key="i">
            <span v-if="seg.needsSpan" :class="seg.classes" :style="seg.style">{{ seg.text }}</span>
            <template v-else>{{ seg.text }}</template>
          </template>
        </p>

        <!-- Overlay avec bouton Analyser -->
        <div v-if="isTextDirty"
             class="analysis-overlay">
          <button class="action primary analyze-button"
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
  import { computed, ref, watch } from 'vue';
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
  }>();

  const emit = defineEmits<{
    'update:text': [value: string];
    analyze: [];
    contextmenu: [event: MouseEvent, container: Element];
  }>();

  const localText = ref(props.text);

  // Synchroniser le texte local avec les props
  watch(() => props.text, newText => {
    localText.value = newText;
  });

  function onInput() {
    emit('update:text', localText.value);
  }

  function handleContextMenu(e: MouseEvent) {
    const container = (e.target as HTMLElement).closest('.dictation-text');
    if (container) {
      emit('contextmenu', e, container);
    }
  }

  // Reconstruire segments avec interstices
  const segments = computed(() => {
    if (!props.analysis || !props.analyzedText) {
      return [] as HighlightToken[];
    }
    const tokens = props.highlightedTokens;
    const result: HighlightToken[] = [];
    let lastEnd = 0;
    for (const t of tokens) {
      if (t.start > lastEnd) {
        // Ajouter gap
        result.push({ start: lastEnd, end: t.start, text: props.analyzedText.substring(lastEnd, t.start), classes: [], needsSpan: false });
      }
      result.push(t);
      lastEnd = t.end;
    }
    if (lastEnd < props.analyzedText.length) {
      result.push({ start: lastEnd, end: props.analyzedText.length, text: props.analyzedText.substring(lastEnd), classes: [], needsSpan: false });
    }
    return result;
  });
</script>

<style scoped>
.analyzed-text-container {
  position: relative;
}

.analyzed-text-container.is-dirty {
  pointer-events: none;
}

.dictation-text.blurred {
  filter: blur(1.5px);
  opacity: 0.5;
}

.analysis-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}

.analyze-button {
  pointer-events: all;
}
</style>
