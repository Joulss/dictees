<template>
  <div class="rounded-lg p-4 drop-shadow-md bg-white">
    <input type="text"
           v-model="search"
           class="w-full border rounded-t-sm"
           :class="{ 'rounded-b-sm': searchResults.length === 0 }"
           placeholder="Search a word"
           @input="searchForms"/>

    <div class="max-h-40 overflow-y-auto">
      <template v-if="searchResults.length && !pickedSuggestion">
        <div v-for="(suggestion, index) in searchResults"
             :key="suggestion"
             class="border border-gray-300 border-t-0 p-2 -top-px relative hover:bg-gray-100 cursor-pointer"
             :class="{ 'rounded-b-sm': index === searchResults.length - 1 }"
             @click="selectSuggestion(suggestion)">
          {{ suggestion }}
        </div>
      </template>

      <template v-else-if="selectedWordLemmas.length">
        <div v-for="(lemma, index) in selectedWordLemmas"
             :key="lemma.lemma"
             class="border border-gray-300 border-t-0 p-2 -top-px relative hover:bg-gray-100 cursor-pointer"
             :class="{ 'rounded-b-sm': index === selectedWordLemmas.length - 1 }">
          <span class="font-bold">{{ lemma.lemma }}&nbsp;</span>
          <span>({{ getMappedPos(lemma.pos) }})</span>
          <div class="mt-1 italic">
            <span v-for="(form, formIndex) in lemma.forms"
                  :key="form"
                  class="inline-block mr-2">
              {{ form }}<span v-if="formIndex < lemma.forms.length - 1">,</span>
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>

</template>


<script setup lang="ts">
  import { List, WordLemmaAndForms } from '@/types.ts';
  import { ref } from 'vue';
  import { getLemmasSuggestions, getMappedPos, getWordLemmas } from '@/lefff/lefff.ts';

  defineProps<{
    list: List
  }>();

  const search             = ref('');
  const searchResults      = ref<string[]>([]);
  const pickedSuggestion   = ref('');
  const selectedWordLemmas = ref<WordLemmaAndForms[]>([]);

  function searchForms() {
    pickedSuggestion.value = '';
    selectedWordLemmas.value = [];
    searchResults.value = getLemmasSuggestions(search.value);
  }

  function selectSuggestion(suggestion: string) {
    pickedSuggestion.value = suggestion;
    selectedWordLemmas.value = getWordLemmas(pickedSuggestion.value);
  }
</script>


<style scoped>

</style>
