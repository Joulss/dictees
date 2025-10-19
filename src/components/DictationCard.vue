<template>
  <div class="dictation">

    <!-- Header -->

    <div v-if="!isEditing"
         class="flex items-center gap-2">
      <h2 class="text-xl font-bold">{{ dict.title }}</h2>
      <div class="ml-auto flex gap-2">
        <button class="action neutral edit"
                @click="startEdit">Éditer</button>
        <button class="action danger delete"
                @click="onDelete">Supprimer</button>
      </div>
    </div>

    <div v-else
         class="flex items-center gap-2">
      <div class="text-sm font-bold">Titre</div>
      <input v-model="editableTitle"
             class="flex-1" />
      <button class="action neutral cancel"
              @click="cancelEdit">Annuler</button>
      <button v-if="!isTextDirty && hasUnsavedChanges"
              class="action primary save"
              @click="saveEdit">Enregistrer</button>
    </div>

    <!-- Body -->

    <dictation-text-display :text="editableText"
                            :analyzed-text="analyzedText"
                            :highlighted-tokens="highlightedTokens"
                            :analysis="analysis"
                            :is-editing="isEditing"
                            :is-text-dirty="isTextDirty"
                            :is-analyzing="isAnalyzing"
                            :analysis-error="analysisError"
                            :clicked-token-range="clickedTokenRange"
                            @update:text="onTextUpdate"
                            @analyze="refreshAnalysis"
                            @contextmenu="handleContextMenu" />

    <hr />

    <!-- Mots de la dictée -->

    <dictation-words-display :selected-words="selectedLocal"
                             :previous-words="previousWords"
                             :color="dict.color"
                             :is-editing="isEditing"
                             :display-previous-words="displayPreviousWords"
                             @remove-word="removeSelected" />

    <!-- Menu contextuel -->

    <word-context-menu :visible="contextMenu.visible"
                       :position="contextMenu.position"
                       :menu-items="contextMenu.items"
                       @action="handleContextMenuAction"
                       @close="closeContextMenu"/>

  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, toRef, watch } from 'vue';
  import type { Dictation, SelectedWord } from '../types';
  import { useDictationAnalysis } from '../composables/useDictationAnalysis';
  import { useDictationHighlight } from '../composables/useDictationHighlight';
  import { useContextMenu } from '../composables/useContextMenu';
  import { wordsAreEqual, wordSignature } from '../composables/useWord';
  import { useWordHistory } from '../composables/useWordHistory';
  import WordContextMenu from './WordContextMenu.vue';
  import DictationTextDisplay from './DictationTextDisplay.vue';
  import DictationWordsDisplay from './DictationWordsDisplay.vue';

  const props = defineProps<{
    displayPreviousWords?: boolean
    dict: Dictation
    allDictations: Dictation[]
  }>();

  const emit = defineEmits<{
    update: [payload: Dictation]
    delete: [createdAt: string]
  }>();

  /* État d'édition */

  const isEditing     = ref(false);
  const editableTitle = ref(props.dict.title);
  const editableText  = ref(props.dict.text);
  const selectedLocal = ref<SelectedWord[]>([...props.dict.selectedWords]);

  /* Composables */

  const {
    analyzedText,
    analysis,
    isAnalyzing,
    analysisError,
    isTextDirty,
    refreshAnalysis: performAnalysis,
    markDirty
  } = useDictationAnalysis();

  const { highlightedTokens } = useDictationHighlight({
    analysis,
    analyzedText,
    selectedWords    : selectedLocal,
    allDictations    : toRef(() => props.allDictations),
    currentDictation : toRef(() => props.dict)
  });
  const { previousWords } = useWordHistory({
    analysis,
    analyzedText,
    allDictations    : toRef(() => props.allDictations),
    currentDictation : toRef(() => props.dict)
  });

  const { contextMenu, show: showContextMenu, close: closeContextMenu, handleAction: getActionFromMenu, clickedTokenRange } = useContextMenu({
    analysis,
    analyzedText,
    selectedWords    : selectedLocal,
    allDictations    : toRef(() => props.allDictations),
    currentDictation : toRef(() => props.dict)
  });

  /* Computed */

  const hasUnsavedChanges = computed(() => {
    if (!isEditing.value) {
      return false;
    }
    const titleChanged = editableTitle.value.trim() !== props.dict.title;
    const textChanged  = editableText.value !== props.dict.text;
    const currentSigs  = selectedLocal.value.map(wordSignature).sort();
    const originalSigs = props.dict.selectedWords.map(wordSignature).sort();
    let wordsChanged = currentSigs.length !== originalSigs.length;
    if (!wordsChanged) {
      for (let i = 0; i < currentSigs.length; i++) {
        if (currentSigs[i] !== originalSigs[i]) {
          wordsChanged = true; break;
        }
      }
    }
    return titleChanged || textChanged || wordsChanged;
  });

  /* Actions d'édition */

  function startEdit() {
    editableTitle.value = props.dict.title;
    editableText.value  = props.dict.text;
    isEditing.value     = true;
    refreshAnalysis();
  }

  function cancelEdit() {
    editableTitle.value = props.dict.title;
    editableText.value  = props.dict.text;
    selectedLocal.value = [...props.dict.selectedWords];
    isEditing.value     = false;
    refreshAnalysis();
  }

  function saveEdit() {
    const updated: Dictation = {
      ...props.dict,
      title         : editableTitle.value.trim() || props.dict.title,
      text          : editableText.value,
      selectedWords : [...selectedLocal.value]
    };
    emit('update', updated);
    isEditing.value = false;
  }

  function onDelete() {
    if (confirm(`Supprimer la dictée « ${props.dict.title} » ?`)) {
      emit('delete', props.dict.createdAt);
    }
  }

  /* Gestion du texte */

  function onTextUpdate(newText: string) {
    editableText.value = newText;
    markDirty(newText);
  }

  async function refreshAnalysis() {
    await performAnalysis(editableText.value);
  }

  /* Gestion du menu contextuel */

  function handleContextMenu(e: MouseEvent, container: Element) {
    showContextMenu(e, container);
  }

  function handleContextMenuAction(action: any) {
    const menuAction = getActionFromMenu(action);
    if (menuAction.type === 'info') {
      return;
    }
    if (menuAction.type === 'add-lemma') {
      addWord({
        kind         : 'lemma',
        lemma        : menuAction.lemma,
        lemmaDisplay : menuAction.lemmaDisplay,
        pos          : menuAction.pos
      });
    } else if (menuAction.type === 'add-exotic') {
      addWord({ kind: 'exotic', surface: menuAction.surface });
    } else if (menuAction.type === 'add-exceptional') {
      addWord({
        kind          : 'exceptional',
        surface       : menuAction.surface,
        exceptionType : menuAction.exceptionType
      });
    } else if (menuAction.type === 'remove') {
      removeWordFromDictations(menuAction.word);
    }
    closeContextMenu();
  }

  /* Gestion des mots */

  function addWord(word: SelectedWord) {
    // Vérifier si le mot existe déjà
    const exists = selectedLocal.value.some(w => wordsAreEqual(w, word));
    if (exists) {
      return;
    }
    selectedLocal.value = [...selectedLocal.value, word];
  }

  function removeSelected(word: SelectedWord) {
    selectedLocal.value = selectedLocal.value.filter(w => !wordsAreEqual(w, word));
  }

  function removeWordFromDictations(word: SelectedWord) {
    const indexInCurrent = selectedLocal.value.findIndex(w => wordsAreEqual(w, word));
    if (indexInCurrent !== -1) {
      selectedLocal.value = selectedLocal.value.filter((_, i) => i !== indexInCurrent);
      return;
    }

    for (const dictation of props.allDictations) {
      const indexInDict = dictation.selectedWords.findIndex(w => wordsAreEqual(w, word));
      if (indexInDict !== -1) {
        const updated: Dictation = {
          ...dictation,
          selectedWords: dictation.selectedWords.filter((_, i) => i !== indexInDict)
        };
        emit('update', updated);
        return;
      }
    }
  }

  /* Lifecycle */

  onMounted(() => {
    refreshAnalysis();
    // Fermer le menu contextuel au scroll
    const handleScroll = () => {
      if (contextMenu.value.visible) {
        closeContextMenu();
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    // Nettoyage
    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll, true);
    });
  });

  // Synchroniser selectedLocal quand props.dict.selectedWords change depuis l'extérieur
  watch(() => props.dict.selectedWords, newWords => {
    if (!isEditing.value) {
      selectedLocal.value = [...newWords];
    }
  }, { deep: true });
</script>
