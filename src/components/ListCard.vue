<template>
  <div class="rounded-lg p-4 shadow-md bg-white relative"
       :class="suggestions.length || pickedSuggestion ? 'z-[999]' : 'z-auto'">

    <h2 class="text-xl font-bold mb-2">{{ list.title }}</h2>

    <div class="relative w-full">

      <input type="search"
             v-model="search"
             class="search-input w-full border rounded-t-sm"
             :class="{ 'rounded-b-sm': !suggestions.length }"
             placeholder="Search a word"
             @input="debouncedGetSuggestions" />

      <div v-if="suggestions.length || pickedSuggestion"
           class="panel absolute left-0 top-full w-full max-h-60 overflow-auto overscroll-contain border border-gray-300 rounded-b-sm bg-white shadow-2xl z-50">

        <!-- Suggestions list -->

        <div v-if="suggestions.length && !pickedSuggestion">
          <button v-for="suggestion in suggestions"
                  :key="suggestion.result"
                  class="p-2 hover:bg-gray-100 cursor-pointer antialiased w-full text-left focus:outline-none focus-visible:bg-gray-100"
                  @click="pickSuggestion(suggestion)">
            {{ suggestion.result }}
          </button>
        </div>

        <!-- Selected word lemmas -->

        <template v-if="pickedSuggestionChoices.length || pickedSuggestion">
          <div v-if="pickedSuggestionChoices.length > 1"
               class="p-2">
            <button class="small-action neutral"
                    @click="resetPick">
              <img src="../assets/icons/back.svg"
                   alt="Back icon"
                   class="inline h-3.5 w-3.5 mr-1"/>
              Retour
            </button>
          </div>
          <button v-for="suggestionVariant in pickedSuggestionChoices"
                  :key="suggestionVariant.word"
                  class="p-2 hover:bg-gray-50 cursor-pointer border-t focus:outline-none focus-visible:bg-gray-100 first:border-t-0 border-gray-200 text-left w-full"
                  @click="pickSuggestionVariant(suggestionVariant)">
            <span class="font-bold">{{ suggestionVariant.word }}&nbsp;</span>
            <span v-if="suggestionVariant.kind === 'lemma' && suggestionVariant.pos">({{ getMappedPos(suggestionVariant.pos) }})</span>
            <span v-else-if="suggestionVariant.kind === 'exotic'">(exotique)</span>
            <span v-else-if="suggestionVariant.kind === 'exceptional'">({{ exceptionLabelFor(suggestionVariant.word) }})</span>
            <br />
            <span class="mt-1 italic">
              <span v-for="(form, formIndex) in suggestionVariant.forms"
                    :key="form"
                    class="inline-block mr-2">
                {{ form }}<span v-if="formIndex < suggestionVariant.forms.length - 1">,</span>
              </span>
            </span>
          </button>
        </template>

      </div>
    </div>

    <div class="mt-3 flex gap-2">
      <word-tag v-for="word in sortedWords"
                :word="word"
                :key="word.word"
                @remove="removeWord(word.word)" />
    </div>
  </div>
</template>


<script setup lang="ts">
  import { computed, onBeforeUnmount, ref } from 'vue';
  import { List, ListWord, Suggestion, SuggestionVariant } from '@/types';
  import { getMappedPos, getSuggestionVariants, searchSuggestion, wordExceptions } from '@/lefff/lefff';
  import debounce from 'just-debounce-it';
  import WordTag from '@/components/WordTag.vue';

  const props = defineProps<{ list: List }>();

  const emit = defineEmits<{
    delete: [list: List]
    save: [list: List]
  }>();

  const search                  = ref('');
  const suggestions             = ref<Suggestion[]>([]);
  const pickedSuggestion        = ref('');
  const pickedSuggestionChoices = ref<SuggestionVariant[]>([]);
  const wordsCopy               = ref<ListWord[]>([...props.list.words]);

  const debouncedGetSuggestions = debounce(getSuggestions, 200);

  const sortedWords = computed(() =>
    wordsCopy.value.toSorted((a, b) => (a.word).localeCompare(b.word)));

  function resetPick() {
    pickedSuggestion.value        = '';
    pickedSuggestionChoices.value = [];
  }

  function resetSearch() {
    search.value      = '';
    suggestions.value = [];
    resetPick();
  }

  function getSuggestions() {
    resetPick();
    suggestions.value = searchSuggestion(search.value);
  }

  function pickSuggestion(suggestion: Suggestion) {
    pickedSuggestion.value        = suggestion.result;
    pickedSuggestionChoices.value = getSuggestionVariants(suggestion.kind, suggestion.result);
  }

  function saveList() {
    emit('save', {
      ...props.list,
      words: wordsCopy.value
    });
  }

  function pickSuggestionVariant(lemma: SuggestionVariant) {
    if (!wordsCopy.value.some(w => w.word === lemma.word)) {
      wordsCopy.value.push({
        color : '#5894ff',
        kind  : 'lemma',
        forms : lemma.forms,
        pos   : lemma.pos,
        word  : lemma.word
      });
    }
    resetSearch();
    saveList();
  }

  function removeWord(wordToRemove: string) {
    wordsCopy.value = wordsCopy.value.filter(w => (w.word) !== wordToRemove);
    emit('save', {
      ...props.list,
      words: wordsCopy.value
    });
  }

  function exceptionLabelFor(w: string): string {
    return wordExceptions.find(e => e.surfaces.includes(w))?.exceptionType ?? 'exception';
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
