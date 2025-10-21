import { ref } from 'vue';
import type { AnalyzeResult } from '../types';
import { analyzeText } from '../lefff/analyzeService.ts';

/**
 * Composable pour gérer l'analyse linguistique d'un texte
 */
export function useDictationAnalysis() {
  // Snapshot du texte au moment de l'analyse (stable, ne change pas à chaque frappe)
  const analyzedText = ref<string>('');
  const analysis = ref<AnalyzeResult | null>(null);
  const isAnalyzing = ref(false);
  const analysisError = ref<string | null>(null);
  const isTextDirty = ref(false);

  /* Lance l'analyse d'un texte */
  async function refreshAnalysis(text: string) {
    isAnalyzing.value = true;
    analysisError.value = null;
    try {
      const result = await analyzeText(text);
      // Mise à jour atomique : texte + analyse ensemble
      analyzedText.value = text;
      analysis.value = result;
      isTextDirty.value = false;
    } catch (e: any) {
      analysisError.value = 'Échec de l\'analyse';
      console.error(e);
    } finally {
      isAnalyzing.value = false;
    }
  }

  /* Marque le texte comme modifié (dirty) par rapport au texte analysé */
  function markDirty(currentText: string) {
    isTextDirty.value = currentText !== analyzedText.value;
  }

  /* Marque le texte comme propre (non modifié) */
  function markClean() {
    isTextDirty.value = false;
  }


  return {
    analyzedText,
    analysis,
    isAnalyzing,
    analysisError,
    isTextDirty,
    refreshAnalysis,
    markDirty,
    markClean
  };
}

