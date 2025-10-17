<template>
  <div class="rounded border p-4">
    <!-- Header -->
    <div v-if="!isEditing" class="flex items-center gap-3">
      <h3 class="text-lg font-semibold">{{ dict.title }}</h3>
      <span class="text-sm opacity-70">{{ dict.date }}</span>
      <div class="ml-auto flex gap-2">
        <button class="border rounded px-2 py-1" @click="startEdit">Éditer</button>
        <button class="border rounded px-2 py-1" @click="onDelete">Supprimer</button>
      </div>
    </div>

    <div v-else class="flex items-center gap-2">
      <strong>Titre</strong>
      <input v-model="editableTitle" class="border rounded px-2 py-1 flex-1" />
      <button class="border rounded px-2 py-1" @click="cancelEdit">Annuler</button>
      <button class="border rounded px-2 py-1" @click="saveEdit">Enregistrer</button>
      <button class="border rounded px-2 py-1" @click="refreshAnalysis" :disabled="isAnalyzing">
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

        <p class="text-sm mt-2" v-if="isAnalyzing">Analyse en cours…</p>
        <p class="text-sm text-red-600 mt-2" v-else-if="analysisError">{{ analysisError }}</p>
        <p class="text-xs opacity-70 mt-1" v-else-if="analysis">
          {{ analysis.tokens.length }} tokens analysés
          <span v-if="analysis.stats">— {{ analysis.stats.foundWords }} trouvés, {{ analysis.stats.ambiguousWords }} ambigus</span>
        </p>
      </template>
    </div>

    <!-- Tags -->
    <div v-if="dict.selectedWords?.length" class="mt-3 flex flex-wrap gap-2">
      <span v-for="w in dict.selectedWords" :key="wordKey(w)" class="text-sm bg-slate-200 rounded px-2 py-0.5">
        {{ renderWord(w) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import type { AnalyzeResult, ApiAnalysis, Dictation, SelectedWord } from '../types';
  import { analyzeText } from '../lefff/analyzeService'; // ajuste le chemin si besoin

  const props = defineProps<{
    dict: Dictation
  }>();

  const emit = defineEmits<{
    update: [payload: Dictation];
    delete: [createdAt: string];
  }>();

  const isEditing = ref(false);
  const editableTitle = ref(props.dict.title);
  const editableText = ref(props.dict.text);

  // État d’analyse (cache local à la carte)
  const analysis = ref<AnalyzeResult | null>(null);
  const isAnalyzing = ref(false);
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
      title : editableTitle.value.trim() || props.dict.title,
      text  : editableText.value
    };
    emit('update', updated);
  // si on a modifié le texte et qu'on reste en édition, on laissera l’analyse marquée “dirty”
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
    // Marque le cache comme obsolète sans le vider (utile si on veut cliquer pendant la saisie)
    if (analysis.value) {
      analyzedForText = '__DIRTY__';
    }
  }

  /**
   * Récupère les lemmes dédupliqués pour le token qui couvre un offset donné.
   * Utile au prochain step (menu contextuel).
   */
  function lemmasAtOffset(offset: number): Array<{ lemma: string; lemmaKey: string; pos?: string }> {
    if (!analysis.value) {
      return [];
    }
    const tok = analysis.value.tokens.find(t => t.isWord && offset >= t.start && offset < t.end);
    if (!tok || !tok.analyses?.length) {
      return [];
    }

    const seen = new Set<string>();
    const out: Array<{ lemma: string; lemmaKey: string; pos?: string }> = [];
    for (const a of tok.analyses as ApiAnalysis[]) {
      const key = `${a.lemmaKey}::${a.pos}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({ lemma: a.lemma, lemmaKey: a.lemmaKey, pos: a.pos });
    }
    return out;
  }

  // affichage liste simple (temporaire)
  function renderWord(w: SelectedWord) {
    return w.type === 'lemma' ? w.lemma : w.surfaceNormalized;
  }
  function wordKey(w: SelectedWord) {
    return w.type === 'lemma' ? `L:${w.lemmaKey}` : `S:${w.surfaceNormalized}`;
  }
</script>
