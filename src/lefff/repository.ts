import { getFormToAnalyses, getLemmaToForms } from './assets';
import { normalizeKey } from './helpers/normalizeKey';

export function getAnalysesByForm(surface: string) {
  const key = normalizeKey(surface);
  return getFormToAnalyses().get(key) ?? [];
}

export function getFormsByLemma(lemma: string) {
  const key = normalizeKey(lemma);
  return getLemmaToForms().get(key) ?? [];
}
