<template>
  <div class="rounded-lg p-4 drop-shadow-md bg-white">
    <input type="text"
           v-model="search"
           class="w-full border rounded-t-sm"
           placeholder="Search a word"
           @input="searchForms"/>
    <template v-if="searchResults.length">
      <div v-for="form in searchResults"
           class="border border-gray-300 border-t-0 p-2 -top-px relative">{{ form }}</div>
    </template>
  </div>

</template>


<script setup lang="ts">
  import { List } from '@/types.ts';
  import { ref } from 'vue';
  import { getFormsByLemma, getLemmasSuggestions } from '@/lefff/lefff.ts';

  const search = ref('');
  const searchResults = ref<string[]>([]);

  function searchForms() {
    searchResults.value = getLemmasSuggestions(search.value);
  }

  defineProps<{
    list: List
  }>();
</script>


<style scoped>

</style>
