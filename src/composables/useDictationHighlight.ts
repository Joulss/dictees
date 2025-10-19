import { computed, type ComputedRef, type Ref } from 'vue';
import type { AnalyzeResult, Dictation, SelectedWord } from '../types';
import { getFormsByLemmaAndPos, isExceptionalWord, isExoticWord, isLemmaWord } from './useWord';
import { getWordException } from '../lefff/exceptions';
import { normalizeKey } from '../lefff/helpers/normalizeKey';

interface HighlightParams {
  allDictations: ComputedRef<Dictation[]>
  analysis: Ref<AnalyzeResult | null>
  analyzedText: Ref<string>
  currentDictation: ComputedRef<Dictation>
  selectedWords: Ref<SelectedWord[]>
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#039;');
}

/**
 * Convertit une couleur hexadécimale en RGBA avec opacité
 */
function hexToRgba(hex: string, opacity: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * # useDictationHighlight
 *
 * Composable pour gérer le surlignage des mots dans une dictée
 */
export function useDictationHighlight({
  analysis,
  analyzedText,
  selectedWords,
  allDictations,
  currentDictation
}: HighlightParams) {

  /* Collecte tous les mots à surligner avec leur couleur */
  const wordsToHighlight = computed(() => {
    const words: Array<{
      color: string;
      fontColor: string;
      forms: Set<string>;
      lemma?: string;
      opacity: number;
      pos?: string;
      surface?: string;
    }> = [];

    const currentDate = new Date(currentDictation.value.createdAt);

    for (const dictation of allDictations.value) {
      const dictDate = new Date(dictation.createdAt);
      if (dictDate > currentDate) {
        continue;
      }

      const isCurrent = dictation.createdAt === currentDictation.value.createdAt;
      const wordsSource = isCurrent ? selectedWords.value : dictation.selectedWords;

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

  /* Collecte tous les mots des dictées précédentes avec leurs métadonnées */
  const previousWords = computed(() => {
    const words: Array<{
      color: string
      dictationId: string
      isPresentInCurrentText: boolean
      word: SelectedWord
    }> = [];

    const currentDate = new Date(currentDictation.value.createdAt);

    // Parcourir toutes les dictées antérieures
    for (const dictation of allDictations.value) {
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

  /* Génère le HTML avec surlignage */
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


  return {
    wordsToHighlight,
    previousWords,
    highlightedText
  };
}
