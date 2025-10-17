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
        <span v-for="w in dict.selectedWords" :key="wordKey(w)" class="text-sm bg-slate-200 rounded px-2 py-0.5">
          {{ renderWord(w) }}
        </span>
      </template>
      <template v-else-if="isEditing && selectedLocal.length">
        <span v-for="w in selectedLocal"
              :key="wordKey(w)"
              class="text-sm bg-slate-200 rounded px-2 py-0.5"
              @click.stop="removeSelected(w)"
              title="Cliquer pour retirer">
          {{ renderWord(w) }} ×
        </span>
      </template>
    </div>

  </div>
</template>

<script setup lang="ts">
  import {computed, ref} from 'vue';
  import type { AnalyzeResult, Dictation, SelectedWord } from '../types';
  import { analyzeText } from '../lefff/analyzeService';
  import {normalizeKey} from '../lefff/helpers/normalizeKey.ts'; // ajuste le chemin si besoin

  const props = defineProps<{
    dict: Dictation
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
  let analyzedForText = ''; // mémo pour savoir si l’analyse correspond au texte courant

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

  /* ---------- Analyse : cache + helpers ---------- */

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
      analysisError.value = 'Échec de l’analyse';
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




  const renderedPreview = computed(() => {

  });


  /* -------- CTRL+clic : ajout par lemme/surface -------- */

  function handleCtrlClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest('.word') as HTMLElement | null;
    if (!el) {
      return;
    }
    const start = Number(el.dataset.start);
    if (!Number.isFinite(start)) {
      return;
    }

    // On se base sur lemmas pour déterminer l'ambiguïté
    const options = lemmasAtOffset(start);
    if (options.length === 1) {
      addLemma(options[0]!);
      return;
    }
    if (options.length > 1) {
      // prompt amélioré avec POS visible
      const label = options.map((o, i) => `${i + 1}. ${o.lemmaDisplay || o.lemma} (${o.pos || '?'})`).join('\n');
      const pick = prompt(`Plusieurs lemmes possibles :\n${label}\n\nChoisis un numéro :`);
      const idx = pick ? Number(pick) - 1 : -1;
      if (idx >= 0 && idx < options.length) {
        addLemma(options[idx]!);
      }
      return;
    }

    // aucun lemme → fallback surface normalisée
    const text = el.textContent ?? '';
    if (!text.trim()) {
      return;
    }
    addSurface(normalizeKey(text));
  }

  /**
   * Retourne les lemmes (avec POS) pour le token à l'offset donné,
   * en se basant sur le tableau lemmas du token (pas analyses).
   * Pour chaque lemme, on prend la première analyse correspondante pour le POS.
   */
  function lemmasAtOffset(offset: number): Array<{ lemma: string; lemmaKey: string; pos: string; lemmaDisplay?: string }> {
    if (!analysis.value) {
      return [];
    }
    const matchingLemmas = analysis.value.tokens
      .filter(t => t.isWord && offset >= t.start && offset < t.end)
      .flatMap(t => t.lemmas || []);



    const tok = analysis.value.tokens.find(
      t => t.isWord && offset >= t.start && offset < t.end
    );
    if (!tok || !Array.isArray(tok.lemmas) || tok.lemmas.length === 0) {
      return [];
    }
    if (!Array.isArray(tok.analyses)) {
      return tok.lemmas.map(lemma => ({ lemma, lemmaKey: lemma, pos: '?', lemmaDisplay: lemma }));
    }
    // Pour chaque lemme, on prend la première analyse correspondante pour le POS
    const options: Array<{ lemma: string; lemmaKey: string; pos: string; lemmaDisplay?: string }> = [];
    for (const lemma of tok.lemmas) {
      const analysis = tok.analyses.find(a => a.lemma === lemma);
      options.push({
        lemma,
        lemmaKey     : analysis?.lemmaKey || lemma,
        pos          : analysis?.pos || '?',
        lemmaDisplay : analysis?.lemmaDisplay || lemma
      });
    }
    return options;
  }

  /**
   * Ajoute un lemme sélectionné (dédoublonnage par clé+pos).
   */
  function addLemma(option: { lemma: string; lemmaKey: string; pos: string; lemmaDisplay?: string }) {
    // On ne stocke que lemma/lemmaKey (POS pour affichage seulement)
    if (selectedLocal.value.some(w => w.type === 'lemma' && w.lemmaKey === option.lemmaKey)) {
      return;
    }
    selectedLocal.value.push({ type: 'lemma', lemma: option.lemma, lemmaKey: option.lemmaKey });
  }

  function addSurface(surfaceNormalized: string) {
    if (selectedLocal.value.some(w => w.type === 'surface' && w.surfaceNormalized === surfaceNormalized)) {
      return;
    }
    selectedLocal.value.push({ type: 'surface', surfaceNormalized });
  }

  function removeSelected(w: SelectedWord) {
    selectedLocal.value = selectedLocal.value.filter(x => x !== w);
  }

  /* -------- Rendu tags -------- */
  function renderWord(w: SelectedWord) {
    return w.type === 'lemma' ? w.lemma : w.surfaceNormalized;
  }
  function wordKey(w: SelectedWord) {
    return w.type === 'lemma' ? `L:${w.lemmaKey}` : `S:${w.surfaceNormalized}`;
  }
</script>
