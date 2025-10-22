<template>
  <div class="rounded-lg p-4 shadow-md bg-white relative"
       :class="panelIsVisble ? 'z-[999]' : 'z-auto'">

    <h2 class="text-xl font-bold mb-2">{{ list.title }}</h2>

    <div class="relative w-full">

      <input type="search"
             v-model="search"
             class="search-input w-full border rounded-t-sm"
             :class="{ 'rounded-b-sm': !panelIsVisble }"
             placeholder="Search a word"
             @input="debouncedGetSuggestions" />

      <div v-if="panelIsVisble"
           class="panel absolute left-0 top-full w-full max-h-60 overflow-auto overscroll-contain border border-gray-300 rounded-b-sm bg-white shadow-2xl z-50"
           ref="panelEl">

        <!-- Suggestions list -->

        <div v-if="searchResults.length && !pickedSuggestion">
          <button v-for="suggestion in searchResults"
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
                  :key="lemma.word"
                  class="p-2 hover:bg-gray-50 cursor-pointer border-t focus:outline-none focus-visible:bg-gray-100 first:border-t-0 border-gray-200 text-left w-full"
                  @click="pickLemma(lemma)">
            <span class="font-bold">{{ lemma.word }}&nbsp;</span>
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

    <div v-for="word in wordsCopy"
         :key="word.word"
         class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mt-2">
      <pre>{{ word }}</pre>
    </div>
  </div>
</template>


<script setup lang="ts">
  import { computed, onBeforeUnmount, ref } from 'vue';
  import { LemmaWithForms, List } from '@/types';
  import { getLemmasSuggestions, getMappedPos, getWordLemmas } from '@/lefff/lefff';
  import debounce from 'just-debounce-it';

  const props = defineProps<{ list: List }>();

  const emit = defineEmits<{
    delete: [list: List]
    save: [list: List]
  }>();

  const search             = ref('');
  const searchResults      = ref<string[]>([]);
  const pickedSuggestion   = ref('');
  const selectedWordLemmas = ref<LemmaWithForms[]>([]);
  const wordsCopy          = ref<List['words']>([...props.list.words]);

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

  function pickLemma(lemma: LemmaWithForms) {
    if (!wordsCopy.value.includes(lemma)) {
      wordsCopy.value.push(lemma);
    }
    search.value             = '';
    searchResults.value      = [];
    pickedSuggestion.value   = '';
    selectedWordLemmas.value = [];
    emit('save', {
      ...props.list,
      words: wordsCopy.value
    });
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
