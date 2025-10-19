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

    <div class="mt-3 mb-5">

      <template v-if="!isEditing">
        <p v-if="analysis"
           class="mt-2 dictation-text"
           v-html="highlightedText"></p>
        <p v-else
           class="mt-2 dictation-text">{{ dict.text }}</p>
      </template>

      <template v-else>
        <textarea v-model="editableText"
                  rows="4"
                  @input="onTextInput"></textarea>

        <!-- Texte analysé avec overlay si dirty -->
        <div v-if="analysis"
             class="analyzed-text-container"
             :class="{ 'is-dirty': isTextDirty }">
          <p class="mt-2 dictation-text"
             :class="{ 'blurred': isTextDirty }"
             v-html="highlightedText"
             @contextmenu.prevent="handleRightClick"></p>

          <!-- Overlay avec bouton Analyser -->
          <div v-if="isTextDirty"
               class="analysis-overlay">
            <button class="action primary analyze-button"
                    :disabled="isAnalyzing"
                    @click="refreshAnalysis">
              {{ isAnalyzing ? 'Analyse en cours…' : 'Analyser' }}
            </button>
            <p v-if="analysisError"
               class="text-sm text-red-600 mt-2">{{ analysisError }}</p>
          </div>
        </div>
      </template>
    </div>

    <hr />

    <!-- Mots de la dictée courante -->

    <div>
      <p v-if="selectedLocal.length"
         class="text-sm mb-2 font-bold">Mots de la dictée :</p>

      <div v-if="!isEditing && dict.selectedWords?.length"
           class="flex flex-wrap gap-2">
        <span v-for="w in dict.selectedWords"
              :key="wordKey(w)"
              :style="{ backgroundColor: dict.color, color: 'white', fontStyle: isExoticWord(w) ? 'italic' : 'normal' }"
              class="tag">
          {{ renderWord(w) }}
        </span>
      </div>

      <div v-else-if="isEditing && selectedLocal.length"
           class="flex flex-wrap gap-2">
        <span v-for="w in selectedLocal"
              :key="wordKey(w)"
              :style="{ backgroundColor: dict.color, color: 'white', fontStyle: isExoticWord(w) ? 'italic' : 'normal' }"
              class="tag-edit"
              @click.stop="removeSelected(w)"
              title="Cliquer pour retirer">
          {{ renderWord(w) }}
        </span>
      </div>
    </div>

    <!-- Mots des dictées précédentes -->

    <div v-if="previousWords.length > 0"
         class="mt-2">
      <p class="text-sm mb-2 font-bold">Mots des dictées précédentes :</p>
      <div class="flex flex-wrap gap-2">
        <span v-for="pw in previousWords"
              :key="`${pw.dictationId}-${wordKey(pw.word)}`"
              :class="{
                'disabled': !pw.isPresentInCurrentText,
                'exotic' : isExoticWord(pw.word)
              }"
              :style="{ backgroundColor: pw.isPresentInCurrentText ? pw.color : undefined }"
              class="tag">
          {{ renderWord(pw.word) }}
        </span>
      </div>
    </div>

    <!-- Menu contextuel -->

    <word-context-menu :visible="contextMenu.visible"
                       :position="contextMenu.position"
                       :menu-items="contextMenu.items"
                       @action="handleContextMenuAction"
                       @close="closeContextMenu"/>

  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';
  import type { AnalyzeResult, Dictation, ExceptionalWord, ExoticWord, LemmaWord, MenuItem, MenuItemAction, SelectedWord } from '../types';
  import { analyzeText } from '../lefff/analyzeService';
  import { getAnalysesByForm, getFormsByLemma } from '../lefff/repository';
  import { getLemmaPosToForms } from '../lefff/assets';
  import { getWordException } from '../lefff/exceptions';
  import { normalizeKey } from '../lefff/helpers/normalizeKey';
  import WordContextMenu from './WordContextMenu.vue';

  const props = defineProps<{
    dict: Dictation;
    allDictations: Dictation[];
  }>();

  const emit = defineEmits<{
    update: [payload: Dictation];
    delete: [createdAt: string];
  }>();

  const isEditing     = ref(false);
  const editableTitle = ref(props.dict.title);
  const editableText  = ref(props.dict.text);

  const selectedLocal = ref<SelectedWord[]>([...props.dict.selectedWords]);

  // Snapshot du texte au moment de l'analyse (stable, ne change pas à chaque frappe)
  const analyzedText  = ref<string>('');
  const analysis      = ref<AnalyzeResult | null>(null);
  const isAnalyzing   = ref(false);
  const analysisError = ref<string | null>(null);
  const isTextDirty   = ref(false);

  // Computed pour vérifier si des modifications ont été faites par rapport à la version sauvegardée
  const hasUnsavedChanges = computed(() => {
    if (!isEditing.value) {
      return false;
    }

    // Vérifier si le titre a changé
    const titleChanged = editableTitle.value.trim() !== props.dict.title;

    // Vérifier si le texte a changé
    const textChanged = editableText.value !== props.dict.text;

    // Vérifier si les mots sélectionnés ont changé
    const wordsChanged = JSON.stringify(selectedLocal.value) !== JSON.stringify(props.dict.selectedWords);

    return titleChanged || textChanged || wordsChanged;
  });

  // État du menu contextuel
  const contextMenu = ref<{
    visible: boolean;
    position: { x: number; y: number };
    items: MenuItem[];
  }>({
    visible  : false,
    position : { x: 0, y: 0 },
    items    : []
  });

  /* Edit */

  function startEdit() {
    editableTitle.value = props.dict.title;
    editableText.value = props.dict.text;
    isEditing.value = true;
    isTextDirty.value = false;
    refreshAnalysis();
  }

  function cancelEdit() {
    // Restaurer TOUS les états à leurs valeurs d'origine
    editableTitle.value = props.dict.title;
    editableText.value = props.dict.text;
    selectedLocal.value = [...props.dict.selectedWords];
    isEditing.value = false;
    isTextDirty.value = false;
    // Réanalyser le texte d'origine pour synchroniser analyzedText et analysis
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
    isTextDirty.value = false;
  }

  function onDelete() {
    if (confirm(`Supprimer la dictée « ${props.dict.title} » ?`)) {
      emit('delete', props.dict.createdAt);
    }
  }

  /* Analyse du texte */

  async function refreshAnalysis() {
    isAnalyzing.value = true;
    analysisError.value = null;
    try {
      const result = await analyzeText(editableText.value);
      // Mise à jour atomique : texte + analyse ensemble
      analyzedText.value = editableText.value;
      analysis.value = result;
      isTextDirty.value = false;
    } catch (e: any) {
      analysisError.value = 'Échec de l\'analyse';
      console.error(e);
    } finally {
      isAnalyzing.value = false;
    }
  }

  function onTextInput() {
    // Vérifier si le texte a réellement changé par rapport au texte analysé
    isTextDirty.value = editableText.value !== analyzedText.value;
  }

  /**
   * Utilitaires pour les types de mots
   */

  function isLemmaWord(word: SelectedWord): word is LemmaWord {
    return 'lemma' in word;
  }

  function isExoticWord(word: SelectedWord): word is ExoticWord {
    return 'surface' in word && !('exceptionType' in word);
  }

  function isExceptionalWord(word: SelectedWord): word is ExceptionalWord {
    return 'exceptionType' in word;
  }

  /**
   * Surlignage des mots
   */

  /* Récupère toutes les formes d'un lemme filtré par POS */
  function getFormsByLemmaAndPos(lemma: string, pos: string): string[] {
    // Utiliser lemmaPosToForms.json pour obtenir directement les formes par lemme+pos
    try {
      const lemmaPosToForms = getLemmaPosToForms();
      const key = `${normalizeKey(lemma)} ${pos}`;
      const forms = lemmaPosToForms.get(key);
      if (forms && forms.length > 0) {
        return forms;
      }
    } catch (e) {
      console.warn('Impossible d\'utiliser lemmaPosToForms, fallback sur l\'ancienne méthode', e);
    }

    // Fallback : ancienne méthode si lemmaPosToForms n'est pas disponible
    const allForms = getFormsByLemma(lemma);
    const matchingForms: string[] = [];

    for (const form of allForms) {
      const analyses = getAnalysesByForm(form);
      const hasMatchingPos = analyses.some(a => a.pos === pos);
      if (hasMatchingPos) {
        matchingForms.push(form);
      }
    }

    return matchingForms;
  }

  /* Collecte tous les mots à surligner avec leur couleur
   * Ne se recalcule que si selectedLocal ou allDictations changent
   */
  const wordsToHighlight = computed(() => {
    const words: Array<{
      surface?: string;
      lemma?: string;
      pos?: string;
      color: string;
      opacity: number;
      fontColor: string;
      forms: Set<string>;
    }> = [];

    const currentDate = new Date(props.dict.createdAt);

    for (const dictation of props.allDictations) {
      const dictDate = new Date(dictation.createdAt);
      if (dictDate > currentDate) {
        continue;
      }

      const isCurrent = dictation.createdAt === props.dict.createdAt;
      const wordsSource = isCurrent ? selectedLocal.value : dictation.selectedWords;

      for (const word of wordsSource) {
        if (isLemmaWord(word)) {
          const forms = getFormsByLemmaAndPos(word.lemma, word.pos);
          words.push({
            lemma     : word.lemma,
            pos       : word.pos,
            color     : dictation.color || '#999',
            opacity   : isCurrent ? 1 : 0.15,
            fontColor : isCurrent ? '#fff' : '#333',
            forms     : new Set(forms.map(f => normalizeKey(f)))
          });
        } else if (isExoticWord(word) || isExceptionalWord(word)) {
          words.push({
            surface   : word.surface,
            color     : dictation.color || '#999',
            opacity   : isCurrent ? 1 : 0.15,
            fontColor : isCurrent ? '#fff' : '#333',
            forms     : new Set([normalizeKey(word.surface)])
          });
        }
      }
    }
    return words;
  });

  /* Collecte tous les mots des dictées précédentes avec leurs métadonnées
   * Utilise analyzedText au lieu de editableText pour éviter les recalculs à chaque frappe
   */
  const previousWords = computed(() => {
    const words: Array<{
      word: SelectedWord;
      color: string;
      dictationId: string;
      isPresentInCurrentText: boolean;
    }> = [];

    const currentDate = new Date(props.dict.createdAt);

    // Parcourir toutes les dictées antérieures
    for (const dictation of props.allDictations) {
      const dictDate = new Date(dictation.createdAt);

      if (dictDate >= currentDate) {
        continue;
      }

      for (const word of dictation.selectedWords) {
        let isPresentInCurrentText = false;

        if (isLemmaWord(word)) {
          const forms = getFormsByLemmaAndPos(word.lemma, word.pos);
          const normalizedForms = new Set(forms.map(f => normalizeKey(f)));

          if (analysis.value) {
            isPresentInCurrentText = analysis.value.tokens.some(token => {
              if (!token.isWord) {
                return false;
              }
              // Utiliser analyzedText au lieu de editableText
              const tokenText = analyzedText.value.substring(token.start, token.end);
              const normalizedToken = normalizeKey(tokenText);
              return normalizedForms.has(normalizedToken);
            });
          }
        } else if (isExoticWord(word) || isExceptionalWord(word)) {
          const normalizedSurface = normalizeKey(word.surface);

          if (analysis.value) {
            isPresentInCurrentText = analysis.value.tokens.some(token => {
              if (!token.isWord) {
                return false;
              }
              // Utiliser analyzedText au lieu de editableText
              const tokenText = analyzedText.value.substring(token.start, token.end);
              const normalizedToken = normalizeKey(tokenText);
              return normalizedToken === normalizedSurface;
            });
          }
        }

        words.push({
          word,
          color       : dictation.color || '#999',
          dictationId : dictation.createdAt,
          isPresentInCurrentText
        });
      }
    }

    return words;
  });

  /* Génère le HTML avec surlignage
   * Utilise analyzedText au lieu de editableText pour éviter les recalculs à chaque frappe
   */
  const highlightedText = computed(() => {
    if (!analysis.value || !analyzedText.value) {
      return '';
    }

    const text = analyzedText.value;
    const tokens = analysis.value.tokens;
    const highlights = wordsToHighlight.value;

    let html = '';
    let lastEnd = 0;

    for (const token of tokens) {
      if (token.start > lastEnd) {
        html += escapeHtml(text.substring(lastEnd, token.start));
      }

      const rawTokenText = text.substring(token.start, token.end);
      const normalizedToken = normalizeKey(rawTokenText);

      let style = '';
      const classList: string[] = [];
      let needsSpan = false;

      // Vérifier si le mot doit être surligné
      if (token.isWord) {
        for (const wordHighlight of highlights) {
          if (wordHighlight.forms.has(normalizedToken)) {
            const bgColor = hexToRgba(wordHighlight.color, wordHighlight.opacity);
            style = `background-color: ${bgColor}; color: ${wordHighlight.fontColor};`;
            classList.push('highlighted-word');
            needsSpan = true;
            break;
          }
        }
      }

      // Vérifier si le mot n'a pas de lemme (mot inconnu ou nom propre) et ajouter l'italique
      if (token.isWord && (!token.lemmas || token.lemmas.length === 0)) {
        const exceptionType = getWordException(rawTokenText);
        if (exceptionType) {
          classList.push('exceptional');
          needsSpan = true;
        } else {
          classList.push('italic');
          needsSpan = true;
        }
      }

      // N'encapsuler dans un span que si nécessaire
      if (needsSpan) {
        html += `<span style="${style}" class="${classList.join(' ')}">${escapeHtml(rawTokenText)}</span>`;
      } else {
        html += escapeHtml(rawTokenText);
      }

      lastEnd = token.end;
    }

    if (lastEnd < text.length) {
      html += escapeHtml(text.substring(lastEnd));
    }

    return html;
  });

  /* Utilitaires pour le HTML */
  function escapeHtml(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\'', '&#039;');
  }

  function hexToRgba(hex: string, opacity: number): string {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /* Mapping POS */

  function getMappedPos(pos: string): string {
    const posMap: Record<string, string> = {
      'nc'    : 'nom commun',
      'np'    : 'nom propre',
      'adj'   : 'adjectif',
      'det'   : 'déterminant',
      'v'     : 'verbe',
      'adv'   : 'adverbe',
      'prep'  : 'préposition',
      'coo'   : 'conjonction',
      'csu'   : 'conjonction',
      'pro'   : 'pronom',
      'pri'   : 'pronom interrogatif',
      'cla'   : 'pronom',
      'cld'   : 'pronom',
      'cln'   : 'pronom',
      'clr'   : 'pronom',
      'clg'   : 'pronom',
      'cll'   : 'pronom',
      'ilimp' : 'pronom impersonnel',
      'caimp' : 'pronom démonstratif'
    };
    return posMap[pos] || pos;
  }

  /* Formatte le lemme pour l'affichage en ajoutant un espace avant les caractères spéciaux */
  function formatLemmaDisplay(lemma: string): string {
    return lemma.replace(/([?!:;])$/, ' $1');
  }

  /**
   * Ajout de mots par clic droit
   */

  /* Éclate les lemmes groupés en options distinctes par POS */
  function expandLemmasByPos(wordToken: NonNullable<typeof analysis.value>['tokens'][0]) {
    const options: Array<{ lemma: string; lemmaDisplay: string; pos: string }> = [];

    for (const lemmaEntry of wordToken.lemmas || []) {
      for (const pos of Array.from(lemmaEntry.pos)) {
        options.push({
          lemma        : lemmaEntry.lemma,
          lemmaDisplay : lemmaEntry.lemmaDisplay,
          pos          : pos
        });
      }
    }
    return options;
  }

  /* Gère le clic droit pour afficher le menu contextuel */
  function handleRightClick(e: MouseEvent) {
    e.preventDefault();

    if (!analysis.value) {
      closeContextMenu();
      return;
    }

    const targetElement = e.target as HTMLElement;
    const container = targetElement.closest('.dictation-text');

    if (!container) {
      closeContextMenu();
      return;
    }

    const clickOffset = getTextOffsetFromClick(container, e);

    if (clickOffset === null) {
      closeContextMenu();
      return;
    }

    const token = analysis.value.tokens.find(t =>
      t.isWord && clickOffset >= t.start && clickOffset < t.end
    );

    if (!token) {
      closeContextMenu();
      return;
    }

    // Utiliser analyzedText au lieu de editableText
    const surface = analyzedText.value.substring(token.start, token.end);
    const menuItems = buildContextMenuItems(token, surface);

    if (menuItems.length > 0) {
      contextMenu.value = {
        visible  : true,
        position : { x: e.clientX, y: e.clientY },
        items    : menuItems
      };
    } else {
      closeContextMenu();
    }
  }

  /**
   * Calcule l'offset dans le texte original à partir d'un clic dans le DOM
   */
  function getTextOffsetFromClick(container: Element, e: MouseEvent): number | null {
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) {
      return null;
    }

    let node = range.startContainer;
    let offset = range.startOffset;

    if (node.nodeType !== Node.TEXT_NODE) {
      if (node.childNodes.length > 0 && offset < node.childNodes.length) {
        const childNode = node.childNodes[offset];
        if (childNode.nodeType === Node.TEXT_NODE) {
          node = childNode;
          offset = 0;
        } else if (childNode.firstChild && childNode.firstChild.nodeType === Node.TEXT_NODE) {
          node = childNode.firstChild;
          offset = 0;
        }
      }
    }

    if (node.nodeType !== Node.TEXT_NODE) {
      return null;
    }

    let textOffset = 0;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode === node) {
        return textOffset + offset;
      }
      textOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }

    return null;
  }

  /**
   * Utilitaires pour le menu contextuel
   */

  function buildContextMenuItems(token: NonNullable<typeof analysis.value>['tokens'][0], surface: string): MenuItem[] {
    const items: MenuItem[] = [];
    const normalizedSurface = normalizeKey(surface);

    const currentWordMatch = findMatchingWordInList(selectedLocal.value, normalizedSurface);

    if (currentWordMatch) {
      items.push({
        action   : { type: 'remove', word: currentWordMatch },
        label    : `Retirer "${renderWord(currentWordMatch)}" de cette dictée`,
        isDelete : true
      });
      return items;
    }

    const previousDictation = findWordInPreviousDictations(normalizedSurface);

    if (previousDictation) {
      items.push({
        action      : { type: 'info' },
        label       : `Hérité de "${previousDictation.dictationTitle}"`,
        isInherited : true
      });
      return items;
    }

    const exceptionType = getWordException(surface);

    if (!token.lemmas || token.lemmas.length === 0) {
      if (exceptionType) {
        items.push({
          action        : { type: 'add-exceptional', surface, exceptionType },
          label         : `${surface} (${exceptionType})`,
          isExceptional : true,
          forms         : [surface]
        });
      } else {
        items.push({
          action   : { type: 'add-exotic', surface },
          label    : `${surface} (exotique)`,
          isExotic : true,
          forms    : [surface]
        });
      }
    } else {
      if (exceptionType) {
        items.push({
          action        : { type: 'add-exceptional', surface, exceptionType },
          label         : `${surface} (${exceptionType})`,
          isExceptional : true,
          forms         : [surface]
        });
      }

      const options = expandLemmasByPos(token);
      for (const option of options) {
        const forms = getFormsByLemmaAndPos(option.lemma, option.pos);

        items.push({
          action: {
            type         : 'add-lemma',
            lemma        : option.lemma,
            lemmaDisplay : option.lemmaDisplay,
            pos          : option.pos
          },
          label : `${formatLemmaDisplay(option.lemmaDisplay)} (${getMappedPos(option.pos)})`,
          forms : forms
        });
      }
    }

    return items;
  }

  function findMatchingWordInList(wordList: SelectedWord[], normalizedSurface: string): SelectedWord | null {
    for (const word of wordList) {
      if (isExoticWord(word) || isExceptionalWord(word)) {
        if (normalizeKey(word.surface) === normalizedSurface) {
          return word;
        }
      } else if (isLemmaWord(word)) {
        const forms = getFormsByLemmaAndPos(word.lemma, word.pos);
        const normalizedForms = new Set(forms.map(f => normalizeKey(f)));
        if (normalizedForms.has(normalizedSurface)) {
          return word;
        }
      }
    }
    return null;
  }

  function findWordInPreviousDictations(normalizedSurface: string): { word: SelectedWord; dictationTitle: string } | null {
    const currentDate = new Date(props.dict.createdAt);
    for (const dictation of props.allDictations) {
      const dictDate = new Date(dictation.createdAt);
      if (dictDate >= currentDate) {
        continue;
      }
      const matchedWord = findMatchingWordInList(dictation.selectedWords, normalizedSurface);
      if (matchedWord) {
        return {
          word           : matchedWord,
          dictationTitle : dictation.title
        };
      }
    }
    return null;
  }

  function handleContextMenuAction(action: MenuItemAction) {
    if (action.type === 'info') {
      return;
    }
    if (action.type === 'add-lemma') {
      addLemma({
        lemma        : action.lemma,
        lemmaDisplay : action.lemmaDisplay,
        pos          : action.pos
      });
    } else if (action.type === 'add-exotic') {
      addExoticWord(action.surface);
    } else if (action.type === 'remove') {
      removeWordFromDictations(action.word);
    } else if (action.type === 'add-exceptional') {
      addExceptionalWord(action.surface, action.exceptionType);
    }
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

  function wordsAreEqual(w1: SelectedWord, w2: SelectedWord): boolean {
    if (isLemmaWord(w1) && isLemmaWord(w2)) {
      return w1.lemma === w2.lemma && w1.pos === w2.pos;
    }
    if (isExoticWord(w1) && isExoticWord(w2)) {
      return w1.surface === w2.surface;
    }
    if (isExceptionalWord(w1) && isExceptionalWord(w2)) {
      return w1.surface === w2.surface && w1.exceptionType === w2.exceptionType;
    }
    return false;
  }

  function closeContextMenu() {
    contextMenu.value.visible = false;
  }

  /**
   * Mots sélectionnés
   */

  function addLemma(option: { lemma: string; lemmaDisplay: string; pos: string }) {
    const exists = selectedLocal.value.some(
      w => isLemmaWord(w) && w.lemma === option.lemma && w.pos === option.pos
    );
    if (exists) {
      return;
    }
    selectedLocal.value = [...selectedLocal.value, {
      lemma        : option.lemma,
      lemmaDisplay : option.lemmaDisplay,
      pos          : option.pos
    }];
  }

  function addExoticWord(surface: string) {
    const exists = selectedLocal.value.some(
      w => isExoticWord(w) && w.surface === surface
    );
    if (exists) {
      return;
    }
    selectedLocal.value = [...selectedLocal.value, {
      surface
    }];
  }

  function addExceptionalWord(surface: string, exceptionType: string) {
    const exists = selectedLocal.value.some(
      w => isExceptionalWord(w) && w.surface === surface
    );
    if (exists) {
      return;
    }
    selectedLocal.value = [...selectedLocal.value, {
      surface,
      exceptionType
    }];
  }

  function removeSelected(w: SelectedWord) {
    selectedLocal.value = selectedLocal.value.filter(x => x !== w);
  }

  function renderWord(w: SelectedWord): string {
    if (isLemmaWord(w)) {
      return `${formatLemmaDisplay(w.lemmaDisplay)} (${getMappedPos(w.pos)})`;
    } else if (isExceptionalWord(w)) {
      return `${w.surface} (${w.exceptionType})`;
    } else {
      return w.surface;
    }
  }

  function wordKey(w: SelectedWord): string {
    if (isLemmaWord(w)) {
      return `lemma:${w.lemma}:${w.pos}`;
    } else if (isExceptionalWord(w)) {
      return `exceptional:${w.surface}:${w.exceptionType}`;
    } else {
      return `exotic:${w.surface}`;
    }
  }

  onMounted(() => {
    refreshAnalysis();
  });

  // Synchroniser selectedLocal quand props.dict.selectedWords change depuis l'extérieur
  watch(() => props.dict.selectedWords, newWords => {
    if (!isEditing.value) {
      selectedLocal.value = [...newWords];
    }
  }, { deep: true });
</script>

<style scoped>
.analyzed-text-container {
  position: relative;
}

.analyzed-text-container.is-dirty {
  pointer-events: none; /* Désactive tous les clics quand dirty */
}

.dictation-text.blurred {
  filter: blur(1.5px);
  opacity: 0.5;
}

.analysis-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.3);
  pointer-events: auto; /* Réactive les clics uniquement sur l'overlay */
  z-index: 10;
}

.analyze-button:disabled {
  cursor: wait;
}
</style>
