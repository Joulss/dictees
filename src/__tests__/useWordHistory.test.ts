import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useWordHistory } from '../composables/useWordHistory';
import type { AnalyzeResult, Dictation, SelectedWord } from '../types';

function makeDict(createdAt: string, color: string, words: SelectedWord[]): Dictation {
  return { createdAt, date: createdAt, title: 'D' + createdAt, text: 'texte', color, selectedWords: words };
}

describe('useWordHistory', () => {
  it('marks previous words present in current analyzed text', () => {
    const exotic: SelectedWord = { kind: 'exotic', surface: 'wifi' };
    const prevDict = makeDict('2024-01-01T00:00:00.000Z', '#4CAF50', [exotic]);
    const currentDict = makeDict('2024-01-02T00:00:00.000Z', '#2196F3', []);

    const analysis: AnalyzeResult = {
      stats  : { ambiguousWords: 0, foundWords: 0, known: 0, totalWords: 1, uniqueLemmas: 0 },
      tokens : [{ start: 0, end: 4, text: 'wifi', isWord: true, known: true }]
    };

    const { previousWords } = useWordHistory({
      analysis         : ref(analysis),
      analyzedText     : ref('wifi'),
      allDictations    : ref([prevDict, currentDict]),
      currentDictation : ref(currentDict)
    });

    const list = previousWords.value;
    expect(list).toHaveLength(1);
    expect(list[0].isPresentInCurrentText).toBe(true);
  });
});
// Fin du test useWordHistory
