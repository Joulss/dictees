<template>
  <p class="dictation-text">{{ dictation.text }}</p>
<!--  <pre>{{ previousListsWords }}</pre>-->
<!--  <pre>{{ tokens }}</pre>-->
</template>


<script setup lang="ts">
  import { Dictation, Feed, List } from '@/types.ts';
  import { inject, onMounted, ref, Ref, watch } from 'vue';
  import { RawToken, tokenize } from '@/lefff/helpers/tokenize.ts';

  const props = defineProps<{
    dictation: Dictation
  }>();

  const feed = inject('feed') as Ref<Feed>;

  const tokens = ref<RawToken[]>([]);

  const previousListsWords = feed.value
    .filter(item => item.kind === 'list' && item.createdAt < props.dictation.createdAt)
    .flatMap(list => (list as List).words);

  function refreshTokens() {
    tokens.value = tokenize(props.dictation.text).tokens;
  }

  watch(() => props.dictation.text, () => {
    refreshTokens();
  });

  onMounted(() => {
    refreshTokens();
  });
</script>


<style scoped>

</style>
