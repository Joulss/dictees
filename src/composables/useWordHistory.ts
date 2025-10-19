import { computed, type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import type { AnalyzeResult, Dictation, SelectedWord } from '../types';
import { getNormalizedFormsForWord } from './wordIndex';
import { normalizeKey } from '../lefff/helpers/normalizeKey';

interface WordHistoryParams {
  allDictations: MaybeRefOrGetter<Dictation[]>
  currentDictation: MaybeRefOrGetter<Dictation>
  analysis: Ref<AnalyzeResult | null>
  analyzedText: Ref<string>
}

export function useWordHistory({ allDictations: allInput, currentDictation: currentInput, analysis, analyzedText }: WordHistoryParams) {
  const allDictations = computed(() => toValue(allInput));
  const currentDictation = computed(() => toValue(currentInput));

  const previousWords = computed(() => {
    const words: Array<{ word: SelectedWord; color: string; dictationId: string; isPresentInCurrentText: boolean }> = [];
    if (!analysis.value || !analyzedText.value) {
      return words;
    }

    const tokenSurfaces = new Set<string>();
    for (const t of analysis.value.tokens) {
      if (!t.isWord) {
        continue;
      }
      const surface = analyzedText.value.substring(t.start, t.end);
      tokenSurfaces.add(normalizeKey(surface));
    }

    const currentDate = new Date(currentDictation.value.createdAt);
    for (const dictation of allDictations.value) {
      const dictDate = new Date(dictation.createdAt);
      if (dictDate >= currentDate) {
        continue;
      }
      for (const w of dictation.selectedWords) {
        const forms = getNormalizedFormsForWord(w);
        let present = false;
        for (const f of forms) {
          if (tokenSurfaces.has(f)) {
            present = true; break; 
          } 
        }
        words.push({ word: w, color: dictation.color || '#999', dictationId: dictation.createdAt, isPresentInCurrentText: present });
      }
    }
    return words;
  });

  return { previousWords };
}

