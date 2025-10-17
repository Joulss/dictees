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
        <p class="whitespace-pre-wrap">{{ dict.text }}</p>
      </template>

      <template v-else>
        <textarea v-model="editableText"
                  rows="8"
                  class="w-full border rounded px-2 py-1"
                  @input="markAnalysisDirty"></textarea>

        <p v-if="analysis"
           class="mt-2 whitespace-pre-wrap"
           @click.ctrl="handleCtrlClick">{{ dict.text }}</p>

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

  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import type { AnalyzeResult, Dictation, SelectedWord } from '../types';
  import { analyzeText } from '../lefff/analyzeService';

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

  let analyzedForText = '';

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
    if (analysis.value) {
      analyzedForText = '__DIRTY__';
    }
  }

  /* Mapping POS */

  function getMappedPos(pos: string): string {
    const posMap: Record<string, string> = {
      'nc'   : 'nom commun',
      'np'   : 'nom propre',
      'adj'  : 'adjectif',
      'det'  : 'déterminant',
      'v'    : 'verbe',
      'adv'  : 'adverbe',
      'prep' : 'préposition',
      'coo'  : 'conjonction',
      'csu'  : 'conjonction',
      'pro'  : 'pronom',
      'cla'  : 'pronom',
      'cld'  : 'pronom',
      'cln'  : 'pronom',
      'clr'  : 'pronom',
      'clg'  : 'pronom',
      'cll'  : 'pronom'
    };
    return posMap[pos] || pos;
  }

  /**
   * Ajout de mots par Ctrl+Clic
   */

  /* Récupère l'offset du clic dans le texte */
  function getClickOffset(): number | null {
    const selection = globalThis.getSelection();
    if (!selection?.rangeCount) {
      return null;
    }
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node?.nodeType !== Node.TEXT_NODE || !node.textContent) {
      return null;
    }
    return range.startOffset;
  }

  /* Trouve le token correspondant à l'offset cliqué */
  function findWordTokenAtOffset(offset: number) {
    return analysis.value?.tokens.find(t =>
      t.isWord &&
      offset >= t.start &&
      offset < t.end &&
      t.lemmas?.length
    );
  }

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
      .map((opt, i) => `${i + 1}. ${opt.lemmaDisplay} (${getMappedPos(opt.pos)})`)
      .join('\n');

    const pick = prompt(`Plusieurs lemmes possibles :\n${promptLabel}\n\nChoisis un numéro :`);
    return pick ? Number(pick) - 1 : -1;
  }

  /* Gère le Ctrl+Clic pour sélectionner un mot */
  function handleCtrlClick() {
    // 1. Récupérer l'offset du clic
    const offset = getClickOffset();
    if (offset === null) {
      return;
    }
    // 2. Trouver le token correspondant
    const wordToken = findWordTokenAtOffset(offset);
    if (!wordToken) {
      console.log('Aucun lemme trouvé pour ce mot');
      return;
    }
    // 3. Éclater les lemmes par POS
    const options = expandLemmasByPos(wordToken);
    console.log('Options éclatées par POS:', options);
    if (options.length === 0) {
      return;
    }
    // 4. Sélection automatique si un seul choix, sinon demander
    let selectedIndex = 0;
    if (options.length > 1) {
      selectedIndex = promptUserChoice(options);
      if (selectedIndex < 0 || selectedIndex >= options.length) {
        return; // Annulation ou choix invalide
      }
    }
    // 5. Ajouter le lemme sélectionné
    addLemma(options[selectedIndex]!);
    // 6. Nettoyer la sélection
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
    selectedLocal.value.push({
      type         : 'lemma',
      lemma        : option.lemma,
      lemmaDisplay : option.lemmaDisplay,
      pos          : option.pos
    });
    console.log('Mot ajouté:', option);
  }

  function removeSelected(w: SelectedWord) {
    selectedLocal.value = selectedLocal.value.filter(x => x !== w);
  }

  function renderWord(w: SelectedWord): string {
    return `${w.lemmaDisplay} (${getMappedPos(w.pos)})`;
  }

  function wordKey(w: SelectedWord): string {
    return `${w.lemma}:${w.pos}`;
  }
</script>
