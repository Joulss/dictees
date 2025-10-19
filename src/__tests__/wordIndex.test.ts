import { describe, expect, it, vi } from 'vitest';

vi.mock('../composables/useWord', async() => {
  const actual = await vi.importActual<typeof import('../composables/useWord')>('../composables/useWord');
  return {
    ...actual,
    getFormsByLemmaAndPos: (lemma: string, pos: string) => {
      if (lemma === 'chat' && pos === 'nc') {
        return ['chat', 'Chats'];
      }
      if (lemma === 'manger' && pos === 'v') {
        return ['mange', 'manges'];
      }
      return [];
    }
  };
});

import { buildWordDescriptors, getNormalizedFormsForWord } from '../composables/wordIndex';
import type { Dictation, SelectedWord } from '../types';

function dict(id: string, color: string, words: SelectedWord[]): Dictation {
  return { createdAt: id, date: id, title: 'D' + id, text: '', color, selectedWords: words };
}

describe('wordIndex', () => {
  it('getNormalizedFormsForWord returns normalized forms for lemma', () => {
    const w: SelectedWord = { kind: 'lemma', lemma: 'manger', lemmaDisplay: 'manger', pos: 'v' };
    const forms = getNormalizedFormsForWord(w);
    expect(forms.has('mange')).toBe(true);
    expect(forms.has('manges')).toBe(true);
  });
  it('buildWordDescriptors aggregates previous and current dictations', () => {
    const wPrev: SelectedWord = { kind: 'lemma', lemma: 'manger', lemmaDisplay: 'manger', pos: 'v' };
    const wCurr: SelectedWord = { kind: 'lemma', lemma: 'chat', lemmaDisplay: 'chat', pos: 'nc' };
    const dPrev = dict('2024-01-01', '#4CAF50', [wPrev]);
    const dCurr = dict('2024-01-02', '#2196F3', [wCurr]);
    const descriptors = buildWordDescriptors([dPrev, dCurr], dCurr, [wCurr]);
    expect(descriptors.some(d => d.word === wPrev && !d.isCurrent)).toBe(true);
    expect(descriptors.some(d => d.word === wCurr && d.isCurrent)).toBe(true);
  });
});
