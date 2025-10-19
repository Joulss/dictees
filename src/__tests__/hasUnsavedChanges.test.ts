import { describe, expect, it, vi } from 'vitest';
// Mock partiel AVANT l'import afin de conserver les autres exports du module
vi.mock('../composables/useWord', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    getFormsByLemmaAndPos: (lemma: string, pos: string) => {
      if (lemma === 'chat' && pos === 'nc') {
        return ['chat', 'Chat'];
      }
      if (lemma === 'manger' && pos === 'v') {
        return ['mange'];
      }
      return [];
    }
  };
});
import { wordSignature } from '../composables/useWord';
import type { SelectedWord } from '../types';

function hasUnsavedChanges(title: string, baseTitle: string, text: string, baseText: string, current: SelectedWord[], original: SelectedWord[]): boolean {
  const titleChanged = title.trim() !== baseTitle;
  const textChanged = text !== baseText;
  const currSigs = current.map(wordSignature).sort();
  const origSigs = original.map(wordSignature).sort();
  let wordsChanged = currSigs.length !== origSigs.length;
  if (!wordsChanged) {
    for (let i = 0;i < currSigs.length;i++) {
      if (currSigs[i] !== origSigs[i]) {
        wordsChanged = true; break;
      }
    }
  }
  return titleChanged || textChanged || wordsChanged;
}

describe('hasUnsavedChanges logic', () => {
  const w1: SelectedWord = { kind: 'exotic', surface: 'wifi' };
  const w2: SelectedWord = { kind: 'exotic', surface: 'usb' };
  it('detects no changes when identical data', () => {
    expect(hasUnsavedChanges('Titre', 'Titre', 'Texte', 'Texte', [w1], [w1])).toBe(false);
  });
  it('detects title change', () => {
    expect(hasUnsavedChanges('Titre mod', 'Titre', 'Texte', 'Texte', [w1], [w1])).toBe(true);
  });
  it('detects text change', () => {
    expect(hasUnsavedChanges('Titre', 'Titre', 'Texte2', 'Texte', [w1], [w1])).toBe(true);
  });
  it('detects word list change (addition)', () => {
    expect(hasUnsavedChanges('Titre', 'Titre', 'Texte', 'Texte', [w1, w2], [w1])).toBe(true);
  });
  it('detects word list change (replacement)', () => {
    expect(hasUnsavedChanges('Titre', 'Titre', 'Texte', 'Texte', [w2], [w1])).toBe(true);
  });
});
import { buildWordDescriptors } from '../composables/wordIndex';
import type { Dictation } from '../types';

function dict(id: string, color: string, words: SelectedWord[]): Dictation {
  return { createdAt: id, date: id, title: 'D' + id, text: '', color, selectedWords: words };
}

describe('wordIndex.buildWordDescriptors', () => {
  it('marks current words with opacity 1 and previous with reduced opacity', () => {
    const w1: SelectedWord = { kind: 'lemma', lemma: 'chat', lemmaDisplay: 'chat', pos: 'nc' };
    const w2: SelectedWord = { kind: 'lemma', lemma: 'manger', lemmaDisplay: 'manger', pos: 'v' };
    const dPrev = dict('2024-01-01', '#4CAF50', [w2]);
    const dCurr = dict('2024-01-02', '#2196F3', [w1]);
    const list = buildWordDescriptors([dPrev, dCurr], dCurr, [w1]);
    const currDesc = list.find(d => d.isCurrent)!;
    const prevDesc = list.find(d => !d.isCurrent)!;
    expect(currDesc.opacity).toBe(1);
    expect(prevDesc.opacity).toBeLessThan(1);
  });
});
