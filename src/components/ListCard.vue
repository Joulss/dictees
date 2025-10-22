<template>
  <div class="rounded-lg p-4 shadow-md bg-white relative"
       :class="panelIsVisble ? 'z-[999]' : 'z-auto'">

    <div class="relative w-full">

      <input type="text"
             v-model="search"
             class="w-full border rounded-t-sm"
             :class="{ 'rounded-b-sm': !panelIsVisble }"
             placeholder="Search a word"
             @input="searchForms"/>

      <div v-if="panelIsVisble"
           class="panel absolute left-0 top-full w-full max-h-60 overflow-auto overscroll-contain border border-gray-300 rounded-b-sm bg-white shadow-2xl z-50">

        <!-- Suggestions list -->

        <template v-if="searchResults.length && !pickedSuggestion">
          <div v-for="suggestion in searchResults"
               :key="suggestion"
               class="p-2 hover:bg-gray-100 cursor-pointer antialiased"
               @click="selectSuggestion(suggestion)">
            {{ suggestion }}
          </div>
        </template>

        <!-- Selected word lemmas -->

        <template v-else-if="selectedWordLemmas.length">
          <div class="p-2">
            <button class="small-action primary"
                    @click="resetPick">
              <img src="../assets/icons/back.svg"
                   alt="Back icon"
                   class="inline h-3.5 w-3.5 mr-1 invert"/>
              Retour
            </button>
          </div>
          <div v-for="lemma in selectedWordLemmas"
               :key="lemma.lemma"
               class="p-2 hover:bg-gray-50 cursor-default border-t first:border-t-0 border-gray-200">
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
  </div>
</template>

<script setup lang="ts">
// All comments in English
  import { computed, ref } from 'vue';
  import { List, WordLemmaAndForms } from '@/types';
  import { getLemmasSuggestions, getMappedPos, getWordLemmas } from '@/lefff/lefff';

  defineProps<{ list: List }>();

  const search = ref('');
  const searchResults = ref<string[]>([]);
  const pickedSuggestion = ref('');
  const selectedWordLemmas = ref<WordLemmaAndForms[]>([]);

  const panelIsVisble = computed(() =>
    (searchResults.value.length && !pickedSuggestion.value)
    || selectedWordLemmas.value.length);

  function resetPick() {
    pickedSuggestion.value = '';
    selectedWordLemmas.value = [];
  }

  function searchForms() {
    resetPick();
    searchResults.value = getLemmasSuggestions(search.value);
  }

  function selectSuggestion(suggestion: string) {
    pickedSuggestion.value = suggestion;
    selectedWordLemmas.value = getWordLemmas(suggestion);
  }
</script>


<style scoped>
  .panel {
    transform: translateY(-1px);
  }
</style>
