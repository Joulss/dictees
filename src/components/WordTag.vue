<template>
  <span :style="{
          backgroundColor: isDisabled ? '#ccc' : color,
          color: isDisabled ? '#666' : 'white',
          fontStyle: isExotic ? 'italic' : 'normal'
        }"
        class="tag"
        :class="{
          edit: isEditing,
          disabled: isDisabled
        }"
        @click.stop="isEditing && !isDisabled ? emit('remove') : undefined">
    {{ displayedWord }}{{ displayedPos ? ' ' + displayedPos : '' }}
  </span>
</template>


<script setup lang="ts">
  import { SelectedWord } from '../types.ts';
  import { computed } from 'vue';
  import { formatLemmaDisplay, getMappedPos, isLemmaWord } from '../composables/useWord';

  const emit = defineEmits(['remove']);

  const props = withDefaults(defineProps<{
    word: SelectedWord
    color: string
    isDisabled?: boolean
    isEditing: boolean
    isExotic: boolean
  }>(), {
    isDisabled: false
  });

  const displayedWord = computed(() => {
    return isLemmaWord(props.word)
      ? formatLemmaDisplay(props.word.lemmaDisplay)
      : props.word.surface;
  });

  const displayedPos = computed(() => {
    if (isLemmaWord(props.word)) {
      return `(${getMappedPos(props.word.pos)})`;
    }
    return 'exceptionType' in props.word ? `(${props.word.exceptionType})` : '';
  });

</script>


<style scoped>
  .tag {
    display: inline-block;
    padding: 0.2em 0.6em;
    border-radius: 0.2em;
    margin: 0.1em;
    cursor: default;
    transition: background-color 0.3s, color 0.3s;
  }

  .tag.edit:not(.disabled) {
    cursor: pointer;
  }

  .tag.disabled {
    cursor: default;
  }
</style>
