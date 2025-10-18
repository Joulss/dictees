<template>
  <div class="dictation">

    <!-- Header -->

    <div v-if="!isEditing"
         class="flex items-center gap-2">
      <h2 class="text-xl font-bold">{{ dict.title }}</h2>
      <div class="ml-auto flex gap-2">
        <button class="neutral edit"
                @click="startEdit">Éditer</button>
        <button class="danger delete"
                @click="onDelete">Supprimer</button>
      </div>
    </div>

    <div v-else
         class="flex items-center gap-2">
      <strong>Titre</strong>
      <input v-model="editableTitle"
             class="flex-1" />
      <button class="neutral cancel"
              @click="cancelEdit">Annuler</button>
      <button class="primary save"
              @click="saveEdit">Enregistrer</button>
    </div>

    <!-- Body -->

    <div class="mt-3">

      <template v-if="!isEditing">
        <p v-if="analysis"
           class="mt-2 dictation-text"
           v-html="highlightedText"></p>
        <p v-else
           class="mt-2 dictation-text">{{ dict.text }}</p>
        <br />
      </template>

      <template v-else>
        <textarea v-model="editableText"
                  rows="4"
                  @input="markAnalysisDirty"></textarea>
        <p v-if="analysis"
           class="mt-2 dictation-text"
           v-html="highlightedText"
           @contextmenu.prevent="handleRightClick"></p>
        <br />
        <p v-if="isAnalyzing"
           class="text-sm mt-2">Analyse en cours…</p>
        <p v-else-if="analysisError"
           class="text-sm text-red-600 mt-2">{{ analysisError }}</p>
        <!--        <p v-else-if="analysis"-->
        <!--           class="text-xs opacity-70 mt-1">-->
        <!--          {{ analysis.tokens.length }} tokens analysés-->
        <!--          <span v-if="analysis.stats">— {{ analysis.stats.foundWords }} trouvés, {{ analysis.stats.ambiguousWords }} ambigus</span>-->
        <!--        </p>-->
      </template>
    </div>

    <!-- Mots de la dictée courante -->

    <div class="mt-3">
      <p v-if="selectedLocal.length"
         class="text-xs mb-2 font-bold">Mots de la dictée :</p>

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
          {{ renderWord(w) }} ×
        </span>
      </div>
    </div>

    <!-- Mots des dictées précédentes -->

    <div v-if="previousWords.length > 0"
         class="mt-2">
      <p class="text-xs mb-2 font-bold">Mots des dictées précédentes :</p>
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
  import type { AnalyzeResult, Dictation, ExoticWord, LemmaWord, MenuItem, MenuItemAction, SelectedWord } from '../types';
  import { analyzeText } from '../lefff/analyzeService';
  import { getAnalysesByForm, getFormsByLemma } from '../lefff/repository';
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

  const analysis      = ref<AnalyzeResult | null>(null);
  const isAnalyzing   = ref(false);
  const analysisError = ref<string | null>(null);

  // Trigger pour forcer le recalcul du surlignage
  const highlightTrigger = ref(0);

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

  let analyzedForText = '';
  let textDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /* Edit */

  function startEdit() {
    editableTitle.value = props.dict.title;
    editableText.value = props.dict.text;
    isEditing.value = true;
    ensureAnalysis();
  }

  function cancelEdit() {
    isEditing.value = false;
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

    // Relancer l'analyse pour mettre à jour le surlignage
    analyzedForText = '__DIRTY__';
    ensureAnalysis();
  }

  function onDelete() {
    if (confirm(`Supprimer la dictée « ${props.dict.title} » ?`)) {
      emit('delete', props.dict.createdAt);
    }
  }

  /* Analyse du texte */

  async function ensureAnalysis() {
    if (analysis.value && analyzedForText === editableText.value) {
      return;
    }
    await refreshAnalysis();
  }

  async function refreshAnalysis() {
    isAnalyzing.value = true;
    analysisError.value = null;
    try {
      analysis.value = await analyzeText(editableText.value);
      analyzedForText = editableText.value;
    } catch (e: any) {
      analysisError.value = 'Échec de l\'analyse';
      console.error(e);
    } finally {
      isAnalyzing.value = false;
    }
  }

  function markAnalysisDirty() {
    // Annuler le timer précédent si existe
    if (textDebounceTimer) {
      clearTimeout(textDebounceTimer);
    }

    // Marquer comme sale
    analyzedForText = '__DIRTY__';

    // Relancer l'analyse après 500ms de pause dans la frappe
    textDebounceTimer = globalThis.setTimeout(() => {
      ensureAnalysis();
      textDebounceTimer = null;
    }, 500);
  }

  /**
   * Utilitaires pour les types de mots
   */

  function isLemmaWord(word: SelectedWord): word is LemmaWord {
    return 'lemma' in word;
  }

  function isExoticWord(word: SelectedWord): word is ExoticWord {
    return 'surface' in word;
  }

  /**
   * Surlignage des mots
   */

  /* Récupère toutes les formes d'un lemme filtré par POS */
  function getFormsByLemmaAndPos(lemma: string, pos: string): string[] {
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

  /* Collecte tous les mots à surligner avec leur couleur - REACTIVE */
  const wordsToHighlight = computed(() => {
    const words: Array<{
      surface?: string; // pour les mots exotiques
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
            fontColor : isCurrent ? '#fff' : '#000',
            forms     : new Set(forms.map(f => normalizeKey(f)))
          });
        } else if (isExoticWord(word)) {
          // Pour les mots exotiques, on surligne uniquement la forme exacte
          words.push({
            surface   : word.surface,
            color     : dictation.color || '#999',
            opacity   : isCurrent ? 1 : 0.15,
            fontColor : isCurrent ? '#fff' : '#000',
            forms     : new Set([normalizeKey(word.surface)])
          });
        }
      }
    }
    return words;
  });

  /* Collecte tous les mots des dictées précédentes avec leurs métadonnées */
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

      // Ignorer les dictées postérieures et la dictée courante
      if (dictDate >= currentDate) {
        continue;
      }

      for (const word of dictation.selectedWords) {
        let isPresentInCurrentText = false;

        if (isLemmaWord(word)) {
          // Vérifier si ce lemme apparaît dans le texte actuel
          const forms = getFormsByLemmaAndPos(word.lemma, word.pos);
          const normalizedForms = new Set(forms.map(f => normalizeKey(f)));

          if (analysis.value) {
            isPresentInCurrentText = analysis.value.tokens.some(token => {
              if (!token.isWord) {
                return false;
              }
              const tokenText = editableText.value.substring(token.start, token.end);
              const normalizedToken = normalizeKey(tokenText);
              return normalizedForms.has(normalizedToken);
            });
          }
        } else if (isExoticWord(word)) {
          // Pour les mots exotiques, vérifier la forme exacte
          const normalizedSurface = normalizeKey(word.surface);

          if (analysis.value) {
            isPresentInCurrentText = analysis.value.tokens.some(token => {
              if (!token.isWord) {
                return false;
              }
              const tokenText = editableText.value.substring(token.start, token.end);
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

  /* Génère le HTML avec surlignage - REACTIVE */
  const highlightedText = computed(() => {
    void highlightTrigger.value; // force recompute
    if (!analysis.value || !editableText.value) {
      return '';
    }

    const text = editableText.value;
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

      // Vérifier si le mot doit être surligné (avec ou sans lemme)
      if (token.isWord) {
        for (const wordHighlight of highlights) {
          if (wordHighlight.forms.has(normalizedToken)) {
            const bgColor = hexToRgba(wordHighlight.color, wordHighlight.opacity);
            style = `background-color: ${bgColor}; color: ${wordHighlight.fontColor}; padding: 0 5px 2px 5px; border-radius: 5px;`;
            break;
          }
        }
      }

      // Vérifier si le mot n'a pas de lemme (mot inconnu ou nom propre) et ajouter l'italique
      if (token.isWord && (!token.lemmas || token.lemmas.length === 0)) {
        style = style ? `${style} font-style: italic;` : 'font-style: italic;';
      }

      html += `<span data-start="${token.start}" data-end="${token.end}"${style ? ` style="${style}"` : ''}>${escapeHtml(rawTokenText)}</span>`;
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
    // Ajouter un espace avant ? et ! et autres caractères spéciaux
    return lemma.replace(/([?!:;])$/, ' $1');
  }

  /**
   * Ajout de mots par Ctrl+Clic
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
    console.log('🖱️ Clic droit détecté', e.target);

    const el = (e.target as HTMLElement).closest('span[data-start]') as HTMLElement | null;
    console.log('📍 Élément trouvé:', el);

    if (!el) {
      console.log('❌ Pas d\'élément span[data-start] trouvé');
      closeContextMenu();
      return;
    }

    const start = Number(el.dataset.start);
    console.log('🔢 Position start:', start);

    const token = analysis.value?.tokens.find(t => t.start === start && t.isWord);
    console.log('🎯 Token trouvé:', token);

    if (!token) {
      console.log('❌ Pas de token correspondant trouvé');
      closeContextMenu();
      return;
    }

    const surface = editableText.value.substring(token.start, token.end);
    console.log('📝 Surface du mot:', surface);

    const menuItems = buildContextMenuItems(token, surface);
    console.log('📋 Menu items:', menuItems);

    if (menuItems.length > 0) {
      console.log('✅ Affichage du menu à la position:', e.clientX, e.clientY);
      contextMenu.value = {
        visible  : true,
        position : { x: e.clientX, y: e.clientY },
        items    : menuItems
      };
    } else {
      console.log('⚠️ Aucun item dans le menu');
      closeContextMenu();
    }
  }

  function buildContextMenuItems(token: NonNullable<typeof analysis.value>['tokens'][0], surface: string): MenuItem[] {
    const items: MenuItem[] = [];
    const normalizedSurface = normalizeKey(surface);

    // Vérifier si le mot (ou l'une de ses formes) est déjà dans la dictée courante
    const currentWordMatch = findMatchingWordInList(selectedLocal.value, normalizedSurface);

    if (currentWordMatch) {
      // Le mot est déjà dans la dictée courante : proposer la suppression
      items.push({
        action   : { type: 'remove', word: currentWordMatch },
        label    : `Retirer "${renderWord(currentWordMatch)}" de cette dictée`,
        isDelete : true
      });
      return items;
    }

    // Vérifier si le mot vient d'une dictée précédente
    const previousDictation = findWordInPreviousDictations(normalizedSurface);

    if (previousDictation) {
      // Le mot vient d'une dictée précédente : afficher juste l'info, pas d'action
      items.push({
        action      : { type: 'info' },
        label       : `Hérité de "${previousDictation.dictationTitle}"`,
        isInherited : true
      });
      return items;
    }

    // Le mot n'est ni dans la dictée courante ni dans une dictée précédente
    // On propose l'ajout du mot
    if (!token.lemmas || token.lemmas.length === 0) {
      // Mot exotique
      items.push({
        action   : { type: 'add-exotic', surface },
        label    : `${surface} (exotique)`,
        isExotic : true
      });
    } else {
      // Mot avec lemme(s)
      const options = expandLemmasByPos(token);
      for (const option of options) {
        items.push({
          action: {
            type         : 'add-lemma',
            lemma        : option.lemma,
            lemmaDisplay : option.lemmaDisplay,
            pos          : option.pos
          },
          label: `${formatLemmaDisplay(option.lemmaDisplay)} (${getMappedPos(option.pos)})`
        });
      }
    }

    return items;
  }

  function findMatchingWordInList(wordList: SelectedWord[], normalizedSurface: string): SelectedWord | null {
    for (const word of wordList) {
      if (isExoticWord(word)) {
        if (normalizeKey(word.surface) === normalizedSurface) {
          return word;
        }
      } else if (isLemmaWord(word)) {
        // Vérifier si l'une des formes du lemme correspond au token
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
      // Item informatif, pas d'action
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
    }
  }

  function removeWordFromDictations(word: SelectedWord) {
    // Retirer de la dictée courante
    const indexInCurrent = selectedLocal.value.findIndex(w => wordsAreEqual(w, word));
    if (indexInCurrent !== -1) {
      selectedLocal.value = selectedLocal.value.filter((_, i) => i !== indexInCurrent);
      console.log('Mot retiré de la dictée courante');
      return;
    }

    // Retirer d'une dictée précédente
    for (const dictation of props.allDictations) {
      const indexInDict = dictation.selectedWords.findIndex(w => wordsAreEqual(w, word));
      if (indexInDict !== -1) {
        const updated: Dictation = {
          ...dictation,
          selectedWords: dictation.selectedWords.filter((_, i) => i !== indexInDict)
        };
        emit('update', updated);
        console.log('Mot retiré d\'une dictée précédente:', dictation.title);
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
      console.log('Ce mot avec ce POS est déjà sélectionné');
      return;
    }
    // Recréer le tableau pour garantir la réactivité
    selectedLocal.value = [...selectedLocal.value, {
      lemma        : option.lemma,
      lemmaDisplay : option.lemmaDisplay,
      pos          : option.pos
    }];
    console.log('Mot ajouté:', option, 'total:', selectedLocal.value.length);
  }

  function addExoticWord(surface: string) {
    const exists = selectedLocal.value.some(
      w => isExoticWord(w) && w.surface === surface
    );
    if (exists) {
      console.log('Ce mot exotique est déjà sélectionné');
      return;
    }
    // Recréer le tableau pour garantir la réactivité
    selectedLocal.value = [...selectedLocal.value, {
      surface
    }];
    console.log('Mot exotique ajouté:', surface, 'total:', selectedLocal.value.length);
  }

  function removeSelected(w: SelectedWord) {
    selectedLocal.value = selectedLocal.value.filter(x => x !== w);
  }

  function renderWord(w: SelectedWord): string {
    if (isLemmaWord(w)) {
      return `${formatLemmaDisplay(w.lemmaDisplay)} (${getMappedPos(w.pos)})`;
    } else {
      // Pour les mots exotiques, affichage en italique
      return w.surface;
    }
  }

  function wordKey(w: SelectedWord): string {
    if (isLemmaWord(w)) {
      return `lemma:${w.lemma}:${w.pos}`;
    } else {
      return `exotic:${w.surface}`;
    }
  }

  onMounted(() => {
    ensureAnalysis();
  });

  // Watch simplifié (force juste le recalcul du surlignage sans debounce complexe)
  watch(selectedLocal, () => {
    highlightTrigger.value++;
  }, { deep: true });

  // Synchroniser selectedLocal quand props.dict.selectedWords change depuis l'extérieur
  watch(() => props.dict.selectedWords, newWords => {
    // Ne mettre à jour que si on n'est pas en mode édition
    // (sinon on écraserait les modifications locales)
    if (!isEditing.value) {
      selectedLocal.value = [...newWords];
    }
  }, { deep: true });
</script>
