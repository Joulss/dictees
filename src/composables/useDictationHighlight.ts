import { computed, type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import type { AnalyzeResult, Dictation, SelectedWord } from '../types';
import { getWordException } from '../lefff/exceptions';
import { normalizeKey } from '../lefff/helpers/normalizeKey';
import { buildWordDescriptors } from './wordIndex';
import { colorWithOpacity } from '../lib/colors';

interface HighlightParams {
  allDictations: MaybeRefOrGetter<Dictation[]>
  analysis: Ref<AnalyzeResult | null>
  analyzedText: Ref<string>
  currentDictation: MaybeRefOrGetter<Dictation>
  selectedWords: Ref<SelectedWord[]>
}

// Type exporté pour la vue
export interface HighlightToken {
  start: number;
  end: number;
  text: string;
  classes: string[];
  style?: string;
  needsSpan: boolean;
}

/**
 * # useDictationHighlight (refactor)
 * Fournit:
 *  - highlightedTokens: structure déclarative pour rendu
 *  - previousWords: métadonnées des mots des dictées précédentes
 */
export function useDictationHighlight({
  analysis,
  analyzedText,
  selectedWords,
  allDictations: allDictationsInput,
  currentDictation: currentDictationInput
}: HighlightParams) {
  const allDictations = computed(() => toValue(allDictationsInput));
  const currentDictation = computed(() => toValue(currentDictationInput));

  // Index des mots (dictées <= courante)
  const wordDescriptors = computed(() => buildWordDescriptors(
    allDictations.value,
    currentDictation.value,
    selectedWords.value
  ));

  /* Tokens enrichis pour rendu */
  const highlightedTokens = computed<HighlightToken[]>(() => {
    if (!analysis.value || !analyzedText.value) {
      return [];
    }
    const text = analyzedText.value;
    const tokens = analysis.value.tokens;
    const descriptors = wordDescriptors.value;

    const result: HighlightToken[] = [];

    for (const token of tokens) {
      const raw = text.substring(token.start, token.end);
      const normalized = normalizeKey(raw);

      let style: string | undefined;
      const classes: string[] = [];
      let needsSpan = false;

      if (token.isWord) {
        // Trouver premier descriptor qui match
        for (const d of descriptors) {
          if (d.forms.has(normalized)) {
            const bg = colorWithOpacity(d.color, d.opacity);
            style = `background-color: ${bg}; color: ${d.fontColor};`;
            classes.push('highlighted-word');
            needsSpan = true;
            break;
          }
        }

        // Mot inconnu / exceptionnel => italique ou classe spécifique
        if (!token.lemmas || token.lemmas.length === 0) {
          const exceptionType = getWordException(raw);
          if (exceptionType) {
            classes.push('exceptional');
          } else {
            classes.push('italic');
          }
          needsSpan = true;
        }
      }

      result.push({
        start : token.start,
        end   : token.end,
        text  : raw,
        classes,
        style,
        needsSpan
      });
    }
    return result;
  });

  return {
    highlightedTokens
  };
}
