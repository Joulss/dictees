import { describe, expect, it, vi } from 'vitest';
// Mocks LEFFF avant import
vi.mock('../lefff/assets', () => {
  return {
    getLemmaPosToForms: () => {
      const m = new Map<string, string[]>();
      m.set('chat nc', ['Chat', 'chat']);
      m.set('manger v', ['mange', 'manges']);
      return m;
    },
    getLemmaToForms: () => ({})
  };
});
vi.mock('../lefff/repository', () => {
  return {
    getFormsByLemma: (lemma: string) => {
      if (lemma === 'chat') {
        return ['chat', 'Chat'];
      }
      if (lemma === 'manger') {
        return ['mange', 'manges'];
      }
      return [];
    },
    getAnalysesByForm: (form: string) => {
      if (form.toLowerCase() === 'chat') {
        return [{ form, lemma: 'chat', pos: 'nc', lemmaKey: 'chat', grammar: { type: 'autre' } }];
      }
      if (form.toLowerCase() === 'mange' || form.toLowerCase() === 'manges') {
        return [{ form, lemma: 'manger', pos: 'v', lemmaKey: 'manger', grammar: { type: 'autre' } }];
      }
      return [];
    }
  };
});
vi.mock('../composables/useWord', () => ({
  getFormsByLemmaAndPos: (lemma: string, pos: string) => {
    if (lemma === 'chat' && pos === 'nc') {
      return ['chat', 'Chat'];
    }
    if (lemma === 'manger' && pos === 'v') {
      return ['mange', 'manges'];
    }
    return [];
  },
  isLemmaWord       : (w: any) => w.kind === 'lemma',
  isExoticWord      : (w: any) => w.kind === 'exotic',
  isExceptionalWord : (w: any) => w.kind === 'exceptional'
}));
import { ref } from 'vue';
import { useDictationHighlight } from '../composables/useDictationHighlight';
import type { AnalyzeResult, Dictation, SelectedWord } from '../types';

function makeDict(createdAt: string, color: string, words: SelectedWord[]): Dictation {
  return { createdAt, date: createdAt, title: 'D' + createdAt, text: 'texte', color, selectedWords: words };
}

describe('useDictationHighlight', () => {
  it('highlights current dictation words with full opacity and previous with reduced (via color map)', () => {
    const analysis: AnalyzeResult = {
      stats  : { ambiguousWords: 0, foundWords: 0, known: 0, totalWords: 2, uniqueLemmas: 0 },
      tokens : [
        { start: 0, end: 4, text: 'Chat', isWord: true, known: true },
        { start: 5, end: 10, text: 'mange', isWord: true, known: true }
      ]
    };
    const currentWord: SelectedWord = { kind: 'lemma', lemma: 'chat', lemmaDisplay: 'chat', pos: 'nc' };
    const previousWord: SelectedWord = { kind: 'lemma', lemma: 'manger', lemmaDisplay: 'manger', pos: 'v' };

    const dictCurrent = makeDict('2024-01-02T00:00:00.000Z', '#2196F3', [currentWord]);
    const dictPrev    = makeDict('2024-01-01T00:00:00.000Z', '#E91E63', [previousWord]);
    const all = ref([dictPrev, dictCurrent]);

    const analyzedText = ref('Chat mange');
    const selectedWords = ref([...dictCurrent.selectedWords]);
    const result = useDictationHighlight({
      analysis         : ref(analysis),
      analyzedText,
      selectedWords,
      allDictations    : all,
      currentDictation : ref(dictCurrent)
    });

    const highlighted = result.highlightedTokens.value;
    expect(highlighted).toHaveLength(2);
    expect(highlighted[0].classes).toContain('highlighted-word');
    expect(highlighted[1].classes).toContain('highlighted-word');
  });
});
