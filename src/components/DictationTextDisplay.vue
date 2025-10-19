<template>
  <div class="mt-3 mb-5">
    <!-- Mode lecture -->
    <template v-if="!isEditing">
      <p v-if="analysis"
         class="mt-2 dictation-text"
         v-html="highlightedHtml"></p>
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
           v-html="highlightedHtml"
           @contextmenu.prevent="handleContextMenu"></p>

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
  import { ref, watch } from 'vue';
  import type { AnalyzeResult } from '../types';

  const props = defineProps<{
    text: string;
    highlightedHtml: string;
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

