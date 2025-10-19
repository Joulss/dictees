import { describe, expect, it } from 'vitest';
import { wordsAreEqual, wordSignature } from '../composables/useWord';

// Mock repository functions before importing (already imported in module, so limited test on caching by reference equality)

describe('useWord utilities', () => {
  it('wordSignature is stable per kind', () => {
    expect(wordSignature({ kind: 'lemma', lemma: 'manger', lemmaDisplay: 'manger', pos: 'v' })).toBe('L:manger:v');
    expect(wordSignature({ kind: 'exotic', surface: 'wifi' })).toBe('E:wifi');
    expect(wordSignature({ kind: 'exceptional', surface: 'oh', exceptionType: 'interjection' })).toBe('X:oh:interjection');
  });

  it('wordsAreEqual respects kind differences', () => {
    const a = { kind: 'exotic', surface: 'wifi' } as const;
    const b = { kind: 'exotic', surface: 'wifi' } as const;
    const c = { kind: 'exceptional', surface: 'wifi', exceptionType: 'interjection' } as const;
    expect(wordsAreEqual(a, b)).toBe(true);
    expect(wordsAreEqual(a, c)).toBe(false);
  });
});

