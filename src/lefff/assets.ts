// imports — chemins adaptés à ta structure actuelle
import { readAsset } from '../lib/ipc';
import type { ApiAnalysis } from '../types';
import { decodeGrammar } from './decoder';

type FormToAnalyses = Map<string, ApiAnalysis[]>;
type LemmaToForms = Map<string, string[]>;

let formToAnalysesCache: FormToAnalyses | null = null;
let lemmaToFormsCache: LemmaToForms | null = null;

export async function loadLefffAssets(): Promise<void> {
  if (formToAnalysesCache && lemmaToFormsCache) return;

  const [formsRaw, lemmasRaw] = await Promise.all([
    readAsset('assets/formToAnalyses.json'),
    readAsset('assets/lemmaToForms.json'),
  ]);

  const formsObj = JSON.parse(formsRaw) as Record<string, ApiAnalysis[]>;
  const lemmasObj = JSON.parse(lemmasRaw) as Record<string, string[]>;

  for (const k of Object.keys(formsObj)) {
    formsObj[k] = formsObj[k].map(a =>
    a.grammar ? a : { ...a, grammar: decodeGrammar(a.pos, a.traits) }
    );
  }
  formToAnalysesCache = new Map(Object.entries(formsObj));
  lemmaToFormsCache = new Map(Object.entries(lemmasObj));
}

export function getFormToAnalyses(): FormToAnalyses {
  if (!formToAnalysesCache) throw new Error('LEFFF assets not loaded');
  return formToAnalysesCache;
}

export function getLemmaToForms(): LemmaToForms {
  if (!lemmaToFormsCache) throw new Error('LEFFF assets not loaded');
  return lemmaToFormsCache;
}
