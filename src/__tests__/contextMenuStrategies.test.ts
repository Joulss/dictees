import { describe, expect, it, vi } from 'vitest';
vi.mock('../lefff/assets', () => ({
  getLemmaPosToForms: () => {
    const m = new Map<string, string[]>();
    m.set('manger v', ['manges']);
    m.set('chat nc', ['chat']);
    return m;
  },
  getLemmaToForms: () => ({})
}));
vi.mock('../lefff/repository', () => ({
  getFormsByLemma   : (lemma: string) => lemma === 'manger' ? ['manges'] : ['chat'],
  getAnalysesByForm : (form: string) => {
    if (form === 'chat') {
      return [{ form, lemma: 'chat', pos: 'nc', lemmaKey: 'chat', grammar: { type: 'autre' } }];
    }
    if (form === 'manges') {
      return [{ form, lemma: 'manger', pos: 'v', lemmaKey: 'manger', grammar: { type: 'autre' } }];
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
      return [];
    }
  };
});
import { exoticExceptionalStrategy, expandLemmasByPos, inheritedStrategy, lemmaStrategy, removeStrategy } from '../composables/contextMenuStrategies';
import type { StrategyContext } from '../composables/contextMenuStrategies';
import type { AnalyzedToken, LemmaWord } from '../types';

function makeLemmaWord(lemma: string, display: string, pos: string): LemmaWord {
  return { kind: 'lemma', lemma, lemmaDisplay: display, pos };
}
function makeToken(surface: string, start: number, end: number, lemmas?: Array<{ lemma: string; lemmaDisplay: string; pos: Set<string> }>): AnalyzedToken {
  return { start, end, text: surface, isWord: true, known: true, lemmas: lemmas?.map(l => ({ grammar: { type: 'autre' }, lemma: l.lemma, lemmaDisplay: l.lemmaDisplay, lemmaKey: l.lemma, pos: l.pos })) };
}

describe('contextMenuStrategies', () => {
  it('removeStrategy returns remove item when currentMatch present', () => {
    const currentMatch = makeLemmaWord('chat', 'chat', 'nc');
    const ctx: StrategyContext = { surface: 'chat', token: makeToken('chat', 0, 4, [{ lemma: 'chat', lemmaDisplay: 'chat', pos: new Set(['nc']) }]), currentMatch, previousMatchTitle: null, lemmaOptions: [] };
    const items = removeStrategy(ctx)!;
    expect(items).toHaveLength(1);
    expect(items[0].action.type).toBe('remove');
  });
  it('inheritedStrategy returns info item when previousMatchTitle present', () => {
    const ctx: StrategyContext = { surface: 'chien', token: makeToken('chien', 0, 5), currentMatch: null, previousMatchTitle: 'Dictée 1', lemmaOptions: [] };
    const items = inheritedStrategy(ctx)!;
    expect(items[0].action.type).toBe('info');
  });
  it('exoticExceptionalStrategy returns exotic or exceptional on token without lemmas', () => {
    const ctx: StrategyContext = { surface: 'd\'acc', token: makeToken('d\'acc', 0, 5), currentMatch: null, previousMatchTitle: null, lemmaOptions: [] };
    const items = exoticExceptionalStrategy(ctx)!;
    expect(['add-exotic', 'add-exceptional']).toContain(items[0].action.type);
  });
  it('lemmaStrategy returns lemma items for lemmaOptions', () => {
    const token = makeToken('manges', 0, 6, [{ lemma: 'manger', lemmaDisplay: 'manger', pos: new Set(['v']) }]);
    const ctx: StrategyContext = { surface: 'manges', token, currentMatch: null, previousMatchTitle: null, lemmaOptions: [{ lemma: 'manger', lemmaDisplay: 'manger', pos: 'v' }] };
    const items = lemmaStrategy(ctx)!;
    expect(items.some(i => i.action.type === 'add-lemma')).toBe(true);
  });
  it('expandLemmasByPos expands lemma entries per POS value', () => {
    const token = makeToken('manges', 0, 6, [{ lemma: 'manger', lemmaDisplay: 'manger', pos: new Set(['v', 'nc']) }]);
    const opts = expandLemmasByPos(token);
    expect(opts).toHaveLength(2);
  });
});
