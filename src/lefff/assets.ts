import { readAsset } from '../lib/ipc';
import type { ApiAnalysis } from '../types';
import { decodeGrammar } from './decoder';
import { normalizeKey } from './helpers/normalizeKey.ts';

type FormToAnalyses = Map<string, ApiAnalysis[]>;
type LemmaToForms = Map<string, string[]>;
type LemmaPosToForms = Map<string, string[]>;

let formToAnalysesCache: FormToAnalyses | null = null;
let lemmaToFormsCache: LemmaToForms | null = null;
let lemmaPosToFormsCache: LemmaPosToForms | null = null;

export async function loadLefffAssets(): Promise<void> {
  try {
    if (formToAnalysesCache && lemmaToFormsCache && lemmaPosToFormsCache) {
      return;
    }

    const [formsRaw, lemmasRaw, lemmaPosRaw] = await Promise.all([
      readAsset('assets/formToAnalyses.json'),
      readAsset('assets/lemmaToForms.json'),
      readAsset('assets/lemmaPosToForms.json')
    ]);

    const formsObj = JSON.parse(formsRaw) as Record<string, ApiAnalysis[]>;
    const lemmasObj = JSON.parse(lemmasRaw) as Record<string, string[]>;
    const lemmaPosObj = JSON.parse(lemmaPosRaw) as Record<string, string[]>;

    for (const k of Object.keys(formsObj)) {
      formsObj[k] = formsObj[k].map(a => a.grammar
        ? a
        : { ...a, grammar: decodeGrammar(a.pos, a.traits) });
    }

    formToAnalysesCache = new Map(Object.entries(formsObj).map(([k, v]) => [normalizeKey(k), v]));
    lemmaToFormsCache = new Map(Object.entries(lemmasObj).map(([k, v]) => [normalizeKey(k), v]));
    lemmaPosToFormsCache = new Map(Object.entries(lemmaPosObj));
  } catch (e) {
    formToAnalysesCache = null;
    lemmaToFormsCache = null;
    lemmaPosToFormsCache = null;
    throw e;
  }
}

export function getFormToAnalyses(): FormToAnalyses {
  if (!formToAnalysesCache) {
    throw new Error('LEFFF assets not loaded');
  }
  return formToAnalysesCache;
}

export function getLemmaToForms(): LemmaToForms {
  if (!lemmaToFormsCache) {
    throw new Error('LEFFF assets not loaded');
  }
  return lemmaToFormsCache;
}

export function getLemmaPosToForms(): LemmaPosToForms {
  if (!lemmaPosToFormsCache) {
    throw new Error('LEFFF assets not loaded');
  }
  return lemmaPosToFormsCache;
}
