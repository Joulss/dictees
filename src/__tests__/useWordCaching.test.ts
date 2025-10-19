import { describe, expect, it, vi } from 'vitest';
// Mock underlying repo calls to count invocations
let repoCalls = 0;
vi.mock('../lefff/repository', () => ({
  getFormsByLemma: (lemma: string) => {
    repoCalls++; return lemma === 'chat' ? ['chat', 'Chat'] : []; 
  },
  getAnalysesByForm: (form: string) => form.toLowerCase() === 'chat' ? [{ form, lemma: 'chat', pos: 'nc', lemmaKey: 'chat', grammar: { type: 'autre' } }] : []
}));
vi.mock('../lefff/assets', () => ({
  getLemmaPosToForms: () => {
    throw new Error('force fallback'); 
  },
  getLemmaToForms: () => ({})
}));
import { getFormsByLemmaAndPos } from '../composables/useWord';

describe('getFormsByLemmaAndPos caching', () => {
  it('caches repeated (lemma,pos) lookups', () => {
    repoCalls = 0;
    const first = getFormsByLemmaAndPos('chat', 'nc');
    const second = getFormsByLemmaAndPos('chat', 'nc');
    expect(first).toEqual(second);
    expect(repoCalls).toBe(1); // second call served from cache
  });
});

