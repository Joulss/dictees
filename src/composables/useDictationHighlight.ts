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
  classes: string[];
  end: number;
  needsSpan: boolean;
  start: number;
  style?: string;
  text: string;
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

  const formMap = computed(() => {
    const descriptors = wordDescriptors.value;
    const map = new Map<string, { color: string; fontColor: string; opacity: number }>();
    for (const d of descriptors) {
      for (const f of d.forms) {
        if (d.isCurrent || !map.has(f)) {
          map.set(f, { color: d.color, fontColor: d.fontColor, opacity: d.opacity });
        }
      }
    }
    return map;
  });

  function buildTokenHighlight(token: AnalyzeResult['tokens'][0], text: string): HighlightToken {
    const raw = text.substring(token.start, token.end);
    if (!token.isWord) {
      return { start: token.start, end: token.end, text: raw, classes: [], needsSpan: false };
    }
    const normalized = normalizeKey(raw);
    const desc = formMap.value.get(normalized);
    const classes: string[] = [];
    let style: string | undefined;
    let needsSpan = false;

    if (desc) {
      style = `background-color: ${colorWithOpacity(desc.color, desc.opacity)}; color: ${desc.fontColor};`;
      classes.push('highlighted-word');
      needsSpan = true;
    }

    if (!token.lemmas || token.lemmas.length === 0) {
      const exceptionType = getWordException(raw);
      classes.push(exceptionType ? 'exceptional' : 'italic');
      needsSpan = true;
    }

    return { start: token.start, end: token.end, text: raw, classes, needsSpan, style };
  }

  const highlightedTokens = computed<HighlightToken[]>(() => {
    if (!analysis.value || !analyzedText.value) {
      return [];
    }
    const text = analyzedText.value;
    return analysis.value.tokens.map(t => buildTokenHighlight(t, text));
  });

  return {
    highlightedTokens
  };
}
