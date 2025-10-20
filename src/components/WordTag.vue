<template>
  <div class="tag-wrapper" v-if="isEditing && !isDisabled">
    <span :style="{
            backgroundColor: color,
            color: 'white',
            fontStyle: isExotic ? 'italic' : 'normal'
          }"
          class="tag tag-with-button">
      {{ displayedWord }}{{ displayedPos ? ' ' + displayedPos : '' }}
    </span>
    <button class="tag-button"
            :style="{
              backgroundColor: color,
              color: 'white'
            }"
            @click.stop="emit('remove')"
            :aria-label="`Supprimer ${displayedWord}`"
            type="button">
      <img src="../assets/icons/x.svg" alt="" aria-hidden="true" />
    </button>
  </div>
  <span v-else
        :style="{
          backgroundColor: !isDisabled ? color : undefined,
          color: isDisabled ? '#666' : 'white',
          fontStyle: isExotic ? 'italic' : 'normal'
        }"
        class="tag"
        :class="{
          disabled: isDisabled
        }">
    {{ displayedWord }}{{ displayedPos ? ' ' + displayedPos : '' }}
  </span>
</template>


<script setup lang="ts">
  import { SelectedWord } from '../types.ts';
  import { computed } from 'vue';
  import { formatLemmaDisplay, getMappedPos } from '../composables/useWord';

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
    return props.word.kind === 'lemma'
      ? formatLemmaDisplay(props.word.lemmaDisplay)
      : props.word.surface;
  });

  const displayedPos = computed(() => {
    if (props.word.kind === 'lemma') {
      return `(${getMappedPos(props.word.pos)})`;
    }
    return props.word.kind === 'exceptional' ? `(${props.word.exceptionType})` : '';
  });
</script>
