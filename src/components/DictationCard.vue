<template>
  <div class="rounded border p-4">

    <!-- Header -->

    <div v-if="!isEditing"
         class="flex items-center gap-3">
      <h3 class="text-lg font-semibold">{{ dict.title }}</h3>
      <span class="text-sm opacity-70">{{ dict.date }}</span>
      <div class="ml-auto flex gap-2">
        <button class="border rounded px-2 py-1"
                @click="startEdit">Éditer</button>
        <button class="border rounded px-2 py-1"
                @click="onDelete">Supprimer</button>
      </div>
    </div>

    <div v-else
         class="flex items-center gap-2">
      <strong>Titre</strong>
      <input v-model="editableTitle"
             class="border rounded px-2 py-1 flex-1" />
      <button class="border rounded px-2 py-1"
              @click="cancelEdit">Annuler</button>
      <button class="border rounded px-2 py-1"
              @click="saveEdit">Enregistrer</button>
      <button class="border rounded px-2 py-1"
              @click="refreshAnalysis" :disabled="isAnalyzing">
        {{ isAnalyzing ? 'Analyse…' : 'Re-analyser' }}
      </button>
    </div>

    <!-- Body -->

    <div class="mt-3">
      <template v-if="!isEditing">
        <p v-if="analysis"
           class="whitespace-pre-wrap"
           v-html="highlightedText"></p>
        <p v-else class="whitespace-pre-wrap">{{ dict.text }}</p>
      </template>

      <template v-else>
        <textarea v-model="editableText"
                  rows="4"
                  class="w-full border rounded px-2 py-1"
                  @input="markAnalysisDirty"></textarea>

        <p v-if="analysis"
           class="mt-2 whitespace-pre-wrap"
           v-html="highlightedText"
           @click.ctrl="handleCtrlClick"></p>

        <p v-if="isAnalyzing"
           class="text-sm mt-2">Analyse en cours…</p>
        <p v-else-if="analysisError"
           class="text-sm text-red-600 mt-2">{{ analysisError }}</p>
        <p v-else-if="analysis"
           class="text-xs opacity-70 mt-1">
          {{ analysis.tokens.length }} tokens analysés
          <span v-if="analysis.stats">— {{ analysis.stats.foundWords }} trouvés, {{ analysis.stats.ambiguousWords }} ambigus</span>
        </p>
      </template>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <template v-if="!isEditing && dict.selectedWords?.length">
        <span v-for="w in dict.selectedWords"
              :key="wordKey(w)"
              :style="{ backgroundColor: dict.color, color: 'white' }"
              class="text-sm rounded px-2 py-0.5">
          {{ renderWord(w) }}
        </span>
      </template>

      <template v-else-if="isEditing && selectedLocal.length">
        <span v-for="w in selectedLocal"
              :key="wordKey(w)"
              :style="{ backgroundColor: dict.color, color: 'white' }"
              class="text-sm rounded px-2 py-0.5 cursor-pointer hover:opacity-80"
              @click.stop="removeSelected(w)"
              title="Cliquer pour retirer">
          {{ renderWord(w) }} ×
        </span>
      </template>
    </div>

    <!-- Mots des dictées précédentes -->
    <div v-if="previousWords.length > 0" class="mt-3 pt-3 border-t">
      <p class="text-xs opacity-60 mb-2">Mots des dictées précédentes :</p>
      <div class="flex flex-wrap gap-2">
        <span v-for="pw in previousWords"
              :key="`${pw.dictationId}-${wordKey(pw.word)}`"
              :style="getWordStyle(pw)"
              class="text-sm rounded px-2 py-0.5">
          {{ renderWord(pw.word) }}
        </span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';
  import type { AnalyzeResult, Dictation, SelectedWord } from '../types';
  import { analyzeText } from '../lefff/analyzeService';
  import { getAnalysesByForm, getFormsByLemma } from '../lefff/repository';
  import { normalizeKey } from '../lefff/helpers/normalizeKey';

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
      lemma: string;
      pos: string;
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
        const forms = getFormsByLemmaAndPos(word.lemma, word.pos);
        words.push({
          lemma     : word.lemma,
          pos       : word.pos,
          color     : dictation.color || '#999',
          opacity   : isCurrent ? 1 : 0.15,
          fontColor : isCurrent ? '#fff' : '#000',
          forms     : new Set(forms.map(f => normalizeKey(f)))
        });
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
        // Vérifier si ce mot apparaît dans le texte actuel
        const forms = getFormsByLemmaAndPos(word.lemma, word.pos);
        const normalizedForms = new Set(forms.map(f => normalizeKey(f)));

        let isPresentInCurrentText = false;
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

  /* Détermine le style d'un mot précédent (couleur si présent, gris sinon) */
  function getWordStyle(pw: { color: string; isPresentInCurrentText: boolean }) {
    if (pw.isPresentInCurrentText) {
      return {
        backgroundColor : pw.color,
        color           : 'white'
      };
    } else {
      return {
        backgroundColor : '#e5e7eb',
        color           : '#6b7280'
      };
    }
  }

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
      if (token.isWord && token.lemmas?.length) {
        for (const wordHighlight of highlights) {
          if (wordHighlight.forms.has(normalizedToken)) {
            const bgColor = hexToRgba(wordHighlight.color, wordHighlight.opacity);
            style = `background-color: ${bgColor}; color: ${wordHighlight.fontColor}; padding: 0 5px 2px 5px; border-radius: 5px;`;
            break;
          }
        }
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

  /* Demande à l'enseignant de choisir parmi plusieurs options */
  function promptUserChoice(options: Array<{ lemma: string; lemmaDisplay: string; pos: string }>): number {
    const promptLabel = options
      .map((opt, i) => `${i + 1}. ${formatLemmaDisplay(opt.lemmaDisplay)} (${getMappedPos(opt.pos)})`)
      .join('\n');

    const pick = prompt(`Plusieurs lemmes possibles :\n${promptLabel}\n\nChoisis un numéro :`);
    return pick ? Number(pick) - 1 : -1;
  }

  /* Gère le Ctrl+Clic pour sélectionner un mot */
  function handleCtrlClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest('span[data-start]') as HTMLElement | null;
    if (!el) {
      return;
    }
    const start = Number(el.dataset.start);
    const token = analysis.value?.tokens.find(t => t.start === start && t.isWord && t.lemmas?.length);
    if (!token) {
      return;
    }

    const options = expandLemmasByPos(token);
    if (options.length === 0) {
      return;
    }

    let selectedIndex = 0;
    if (options.length > 1) {
      selectedIndex = promptUserChoice(options);
      if (selectedIndex < 0 || selectedIndex >= options.length) {
        return;
      }
    }
    addLemma(options[selectedIndex]!);
    globalThis.getSelection()?.removeAllRanges();
  }

  /**
   * Mots sélectionnés
   */

  function addLemma(option: { lemma: string; lemmaDisplay: string; pos: string }) {
    const exists = selectedLocal.value.some(
      w => w.lemma === option.lemma && w.pos === option.pos
    );
    if (exists) {
      console.log('Ce mot avec ce POS est déjà sélectionné');
      return;
    }
    // Recréer le tableau pour garantir la réactivité
    selectedLocal.value = [...selectedLocal.value, {
      type         : 'lemma',
      lemma        : option.lemma,
      lemmaDisplay : option.lemmaDisplay,
      pos          : option.pos
    }];
    console.log('Mot ajouté:', option, 'total:', selectedLocal.value.length);
  }

  function removeSelected(w: SelectedWord) {
    selectedLocal.value = selectedLocal.value.filter(x => x !== w);
  }

  function renderWord(w: SelectedWord): string {
    return `${formatLemmaDisplay(w.lemmaDisplay)} (${getMappedPos(w.pos)})`;
  }

  function wordKey(w: SelectedWord): string {
    return `${w.lemma}:${w.pos}`;
  }

  onMounted(() => {
    ensureAnalysis();
  });

  // Watch simplifié (force juste le recalcul du surlignage sans debounce complexe)
  watch(selectedLocal, () => {
    highlightTrigger.value++;
  }, { deep: true });
</script>
