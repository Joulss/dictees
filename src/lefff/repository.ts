import { getFormToAnalyses, getLemmaToForms } from './assets';
import { normalizeKey } from './helpers/normalizeKey';
import type { ApiAnalysis } from '../types';

export function getAnalysesByForm(surface: string): ApiAnalysis[] {
  const key = normalizeKey(surface);
  const map = getFormToAnalyses();
  const direct = map.get(key);
  if (direct) return direct;

  // Fallback lent (OK pour test) si tes clés JSON ne sont pas normalisées
  for (const [k, v] of map.entries()) {
    if (normalizeKey(k) === key) return v;
  }
  return [];
}

export function getFormsByLemma(lemma: string): string[] {
  const key = normalizeKey(lemma);
  const map = getLemmaToForms();
  const direct = map.get(key);
  if (direct) return direct;

  for (const [k, v] of map.entries()) {
    if (normalizeKey(k) === key) return v;
  }
  return [];
}
