import { describe, expect, it, vi } from 'vitest';
import type { AnalyzedToken, Dictation, SelectedWord } from '../types';
import { _test_buildContextMenuItems } from '../composables/useContextMenu';

// Mocks minimalistes pour les dépendances utilisées indirectement
vi.mock('../lefff/assets', () => ({
  getLemmaPosToForms: () => {
    const m = new Map<string, string[]>();
    m.set('manger v', ['manges']);
    m.set('chat nc', ['chat']);
    m.set('aller v', ['vais']);
    return m;
  },
  getLemmaToForms: () => ({})
}));
vi.mock('../lefff/repository', () => ({
  getFormsByLemma: (lemma: string) => {
    if (lemma === 'manger') {
      return ['manges'];
    }
    if (lemma === 'chat') {
      return ['chat'];
    }
    if (lemma === 'aller') {
      return ['vais'];
    }
    return [];
  },
  getAnalysesByForm: (form: string) => {
    if (form === 'chat') {
      return [{ form, lemma: 'chat', pos: 'nc', lemmaKey: 'chat', grammar: { type: 'autre' } }];
    }
    if (form === 'manges') {
      return [{ form, lemma: 'manger', pos: 'v', lemmaKey: 'manger', grammar: { type: 'autre' } }];
    }
    if (form === 'vais') {
      return [{ form, lemma: 'aller', pos: 'v', lemmaKey: 'aller', grammar: { type: 'autre' } }];
    }
    return [];
  }
}));
vi.mock('../composables/useWord', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    getFormsByLemmaAndPos: (lemma: string, pos: string) => {
      if (lemma === 'manger' && pos === 'v') {
        return ['manges'];
      }
      if (lemma === 'chat' && pos === 'nc') {
        return ['chat'];
      }
      if (lemma === 'aller' && pos === 'v') {
        return ['vais'];
      }
      return [];
    }
  };
});

function makeToken(surface: string, start: number, end: number, lemmas?: Array<{ lemma: string; lemmaDisplay: string; pos: string[] }>): AnalyzedToken {
  return {
    start,
    end,
    text   : surface,
    isWord : true,
    known  : true,
    lemmas : lemmas?.map(l => ({ grammar: { type: 'autre' }, lemma: l.lemma, lemmaDisplay: l.lemmaDisplay, lemmaKey: l.lemma, pos: new Set(l.pos) }))
  };
}

function makeDictation(createdAt: string, selectedWords: SelectedWord[]): Dictation {
  return { color: '#000', createdAt, date: createdAt, selectedWords, text: '...', title: `Dictée ${createdAt}` };
}

describe('useContextMenu/_test_buildContextMenuItems', () => {
  it('produit uniquement remove quand mot présent dans dictée courante', () => {
    const current = makeDictation('2024-01-02T00:00:00.000Z', [{ kind: 'lemma', lemma: 'chat', lemmaDisplay: 'chat', pos: 'nc' }]);
    const previous: Dictation[] = [makeDictation('2024-01-01T00:00:00.000Z', [])];
    const token = makeToken('chat', 0, 4, [{ lemma: 'chat', lemmaDisplay: 'chat', pos: ['nc'] }]);
    const items = _test_buildContextMenuItems(token, 'chat', [...previous, current], current, current.selectedWords);
    expect(items).toHaveLength(1);
    expect(items[0].action.type).toBe('remove');
  });

  it('produit info hérité quand mot présent uniquement dans dictée précédente', () => {
    const previous = makeDictation('2024-01-01T00:00:00.000Z', [{ kind: 'lemma', lemma: 'chat', lemmaDisplay: 'chat', pos: 'nc' }]);
    const current = makeDictation('2024-01-02T00:00:00.000Z', []);
    const token = makeToken('chat', 0, 4, [{ lemma: 'chat', lemmaDisplay: 'chat', pos: ['nc'] }]);
    const items = _test_buildContextMenuItems(token, 'chat', [previous, current], current, current.selectedWords);
    expect(items).toHaveLength(1);
    expect(items[0].action.type).toBe('info');
  });

  it('produit item exceptionnel quand aucun lemme et surface exceptionnelle', () => {
    const current = makeDictation('2024-01-02T00:00:00.000Z', []);
    const token = makeToken('au', 0, 2); // pas de lemmas
    const items = _test_buildContextMenuItems(token, 'au', [current], current, current.selectedWords);
    expect(items).toHaveLength(1);
    expect(items[0].action.type).toBe('add-exceptional');
    expect(items[0].isExceptional).toBe(true);
  });

  it('produit item exotique quand aucun lemme et surface non exceptionnelle', () => {
    const current = makeDictation('2024-01-02T00:00:00.000Z', []);
    const token = makeToken('zzzz', 0, 4); // inexistant
    const items = _test_buildContextMenuItems(token, 'zzzz', [current], current, current.selectedWords);
    expect(items).toHaveLength(1);
    expect(items[0].action.type).toBe('add-exotic');
    expect(items[0].isExotic).toBe(true);
  });

  it('produit lemme + exceptionnel si surface exceptionnelle avec lemmas', () => {
    const current = makeDictation('2024-01-02T00:00:00.000Z', []);
    // On simule un lemme "aller" sur la surface "au" (cas artificiel mais teste la branche)
    const token = makeToken('au', 0, 2, [{ lemma: 'aller', lemmaDisplay: 'aller', pos: ['v'] }]);
    const items = _test_buildContextMenuItems(token, 'au', [current], current, current.selectedWords);
    expect(items.length).toBeGreaterThan(1);
    expect(items[0].action.type).toBe('add-exceptional');
    expect(items.some(i => i.action.type === 'add-lemma')).toBe(true);
  });

  it('produit items lemme classiques pour un mot conjugué', () => {
    const current = makeDictation('2024-01-02T00:00:00.000Z', []);
    const token = makeToken('manges', 0, 6, [{ lemma: 'manger', lemmaDisplay: 'manger', pos: ['v'] }]);
    const items = _test_buildContextMenuItems(token, 'manges', [current], current, current.selectedWords);
    expect(items.some(i => i.action.type === 'add-lemma')).toBe(true);
    const lemmaItem = items.find(i => i.action.type === 'add-lemma');
    expect(lemmaItem?.forms).toEqual(['manges']);
  });
});
