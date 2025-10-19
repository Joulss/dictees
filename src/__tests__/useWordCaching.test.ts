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
    // Retourne une Map vide (pas d'exception, fallback implicite)
    return new Map<string, string[]>();
  },
  getLemmaToForms: () => ({})
}));
import { getFormsByLemmaAndPos } from '../composables/useWord';

// Neutraliser les warnings éventuels liés au fallback
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('getFormsByLemmaAndPos caching', () => {
  it('caches repeated (lemma,pos) lookups', () => {
    repoCalls = 0;
    const first = getFormsByLemmaAndPos('chat', 'nc');
    const second = getFormsByLemmaAndPos('chat', 'nc');
    expect(first).toEqual(second);
    expect(repoCalls).toBe(1); // second call served from cache
  });
});

// Restaurer si besoin dans d'autres tests (ici facultatif)
warnSpy.mockRestore();
