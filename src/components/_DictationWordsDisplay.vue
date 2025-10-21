<template>
  <div>
    <!-- Mots de la dictée courante -->
    <p class="text-sm mb-2 font-bold">Mots de la dictée :</p>

    <div v-if="selectedWords.length"
         class="flex flex-wrap gap-1">
      <word-tag v-for="word in selectedWords"
                :key="wordKey(word)"
                :word="word"
                :color="color"
                :is-editing="isEditing"
                :is-exotic="word.kind === 'exotic'"
                @remove="emit('remove-word', word)" />
    </div>

    <div v-else>
      <p class="italic text-gray-500">Aucun mot sélectionné.</p>
    </div>

    <!-- Mots des dictées précédentes -->

    <template v-if="displayPreviousWords">

      <p class="text-sm mb-2 font-bold mt-2">Mots des dictées précédentes :</p>

      <div v-if="previousWords.length > 0">
        <div class="flex flex-wrap gap-1">
          <word-tag v-for="pw in previousWords"
                    :key="`${pw.dictationId}-${wordKey(pw.word)}`"
                    :word="pw.word"
                    :color="pw.isPresentInCurrentText ? pw.color : '#ccc'"
                    :is-editing="false"
                    :is-exotic="pw.word.kind === 'exotic'"
                    :is-disabled="!pw.isPresentInCurrentText" />
        </div>
      </div>

      <div v-else>
        <p class="italic text-gray-500">Aucun mot sélectionné.</p>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
  import type { SelectedWord } from '../types';
  import { wordKey } from '../composables/useWord';
  import WordTag from './WordTag.vue';

  defineProps<{
    displayPreviousWords?: boolean;
    selectedWords: SelectedWord[];
    previousWords: Array<{
      word: SelectedWord;
      color: string;
      dictationId: string;
      isPresentInCurrentText: boolean;
    }>;
    color: string;
    isEditing: boolean;
  }>();

  const emit = defineEmits<{
    'remove-word': [word: SelectedWord];
  }>();
</script>
