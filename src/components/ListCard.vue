<template>
  <div class="rounded-lg p-4 shadow-md bg-white relative"
       :class="panelIsVisble ? 'z-[999]' : 'z-auto'">

    <div class="relative w-full">

      <input type="search"
             v-model="search"
             ref="inputEl"
             class="search-input w-full border rounded-t-sm"
             :class="{ 'rounded-b-sm': !panelIsVisble }"
             placeholder="Search a word"
             @input="debouncedGetSuggestions" />

      <div v-if="panelIsVisble"
           class="panel absolute left-0 top-full w-full max-h-60 overflow-auto overscroll-contain border border-gray-300 rounded-b-sm bg-white shadow-2xl z-50"
           ref="panelEl">

        <!-- Suggestions list -->

        <div v-if="searchResults.length && !pickedSuggestion">
          <button v-for="(suggestion, index) in searchResults"
                  :key="suggestion"
                  class="p-2 hover:bg-gray-100 cursor-pointer antialiased w-full text-left focus:outline-none focus-visible:bg-gray-100"
                  data-dd-item
                  @click="selectSuggestion(suggestion)">
            {{ suggestion }}
          </button>
        </div>

        <!-- Selected word lemmas -->

        <template v-else-if="selectedWordLemmas.length">
          <div class="p-2">
            <button class="small-action neutral"
                    @click="resetPick">
              <img src="../assets/icons/back.svg"
                   alt="Back icon"
                   class="inline h-3.5 w-3.5 mr-1"/>
              Retour
            </button>
          </div>
          <button v-for="lemma in selectedWordLemmas"
                  :key="lemma.lemma"
                  class="p-2 hover:bg-gray-50 cursor-pointer border-t focus:outline-none focus-visible:bg-gray-100 first:border-t-0 border-gray-200 text-left w-full">
            <span class="font-bold">{{ lemma.lemma }}&nbsp;</span>
            <span>({{ getMappedPos(lemma.pos) }})</span>
            <div class="mt-1 italic">
              <span v-for="(form, formIndex) in lemma.forms"
                    :key="form"
                    class="inline-block mr-2">
                {{ form }}<span v-if="formIndex < lemma.forms.length - 1">,</span>
              </span>
            </div>
          </button>
        </template>

      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
  import { List, WordLemmaAndForms } from '@/types';
  import { getLemmasSuggestions, getMappedPos, getWordLemmas } from '@/lefff/lefff';
  import debounce from 'just-debounce-it';

  defineProps<{ list: List }>();

  const search             = ref('');
  const searchResults      = ref<string[]>([]);
  const pickedSuggestion   = ref('');
  const selectedWordLemmas = ref<WordLemmaAndForms[]>([]);
  const inputEl            = ref<HTMLInputElement | null>(null);
  const panelEl            = ref<HTMLElement | null>(null);

  const debouncedGetSuggestions = debounce(getSuggestions, 200);

  const panelIsVisble = computed(() =>
    (searchResults.value.length && !pickedSuggestion.value)
    || selectedWordLemmas.value.length);

  function resetPick() {
    pickedSuggestion.value   = '';
    selectedWordLemmas.value = [];
  }

  function getSuggestions() {
    resetPick();
    searchResults.value = getLemmasSuggestions(search.value);
  }

  function selectSuggestion(suggestion: string) {
    pickedSuggestion.value   = suggestion;
    selectedWordLemmas.value = getWordLemmas(suggestion);
  }

  onBeforeUnmount(() => {
    debouncedGetSuggestions.cancel();
  });
</script>


<style scoped>
  .panel {
    transform: translateY(-1px);
  }
</style>
