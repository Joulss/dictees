import { readAsset } from '@/lib/ipc';
import type { ApiAnalysis, LemmaWithForms, PosCode, PosFriendly } from '@/types';
import { PosFriendlyEnum } from '@/types';
import { normalizeKey } from '@/lefff/helpers/normalizeKey';
import { decodeGrammar } from '@/lefff/grammarDecoder';

/**
 * # Caches
 */

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
  } catch (error) {
    formToAnalysesCache = null;
    lemmaToFormsCache = null;
    lemmaPosToFormsCache = null;
    throw error;
  }
}

export function assetsLoaded(): boolean {
  return !!formToAnalysesCache && !!lemmaToFormsCache && !!lemmaPosToFormsCache;
}

/**
 * # Getters
 */

export function getAnalysesByForm(text: string) {
  const key = normalizeKey(text);
  return formToAnalysesCache?.get(key) ?? [];
}

export function getFormsByLemma(lemma: string) {
  const key = normalizeKey(lemma);
  return lemmaToFormsCache?.get(key) ?? [];
}

export function getFormsByLemmaAndPos(lemma: string, pos: string) {
  const key = `${normalizeKey(lemma)} ${pos}`;
  return lemmaPosToFormsCache?.get(key) ?? [];
}

export function getMappedPos(pos: PosCode): PosFriendly {
  const posMap: Record<PosCode, PosFriendly> = {
    'adj'       : PosFriendlyEnum.ADJECTIVE,
    'adv'       : PosFriendlyEnum.ADVERB,
    'auxAvoir'  : PosFriendlyEnum.AUXILIARY_VERB,
    'auxEtre'   : PosFriendlyEnum.AUXILIARY_VERB,
    'caimp'     : PosFriendlyEnum.DEMONSTRATIVE_PRONOUN,
    'cla'       : PosFriendlyEnum.PRONOUN,
    'cld'       : PosFriendlyEnum.PRONOUN,
    'cll'       : PosFriendlyEnum.PRONOUN,
    'clg'       : PosFriendlyEnum.PRONOUN,
    'cln'       : PosFriendlyEnum.PRONOUN,
    'clr'       : PosFriendlyEnum.PRONOUN,
    'coo'       : PosFriendlyEnum.CONJUNCTION,
    'csu'       : PosFriendlyEnum.CONJUNCTION,
    'det'       : PosFriendlyEnum.DETERMINER,
    'ilimp'     : PosFriendlyEnum.IMPERSONAL_PRONOUN,
    'nc'        : PosFriendlyEnum.NOUN,
    'np'        : PosFriendlyEnum.PROPER_NOUN,
    'prel'      : PosFriendlyEnum.RELATIVE_PRONOUN,
    'prep'      : PosFriendlyEnum.PREPOSITION,
    'pres'      : PosFriendlyEnum.PRESENTATIVE,
    'pri'       : PosFriendlyEnum.INTERROGATIVE_PRONOUN,
    'pro'       : PosFriendlyEnum.PRONOUN,
    'que'       : PosFriendlyEnum.CONJUNCTION,
    'que_restr' : PosFriendlyEnum.CONJUNCTION,
    'v'         : PosFriendlyEnum.VERB
  };
  return posMap[pos] || pos;
}

export function getLemmasSuggestions(prefix: string): string[] {
  if (prefix.length <= 3) {
    return [];
  }
  const p = normalizeKey(prefix);
  if (!p) {
    return [];
  }
  const isClean = (s: string) => /^[\p{L}’' -]+$/u.test(s);
  const out = new Set<string>();
  const collator = new Intl.Collator('fr', { usage: 'search', sensitivity: 'accent' });

  for (const lemmaKey of (lemmaToFormsCache?.keys() ?? [])) {
    if (!lemmaKey.startsWith(p)) {
      continue;
    }
    const forms = getFormsByLemma(lemmaKey);
    const canonical = forms.find(form => normalizeKey(form) === lemmaKey);
    if (canonical
    && collator.compare(canonical.slice(0, prefix.length), prefix) === 0
    && isClean(canonical)) {
      out.add(canonical);
      continue;
    }
    const match = forms.find(
      f => collator.compare(f.slice(0, prefix.length), prefix) === 0
    );
    if (match && isClean(match)) {
      out.add(match);
    }
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'accent' }));
}

export function getWordLemmas(word: string): LemmaWithForms[] {
  const analyses = getAnalysesByForm(word);
  const seenPos = new Set<PosCode>();
  const out = [];
  for (const analysis of analyses) {
    if (seenPos.has(analysis.pos)) {
      continue;
    }
    seenPos.add(analysis.pos);
    out.push({
      kind  : 'lemma',
      word  : analysis.lemmaDisplay ?? analysis.lemma,
      pos   : analysis.pos,
      forms : getFormsByLemmaAndPos(analysis.lemma, analysis.pos)
    } satisfies LemmaWithForms);
  }
  return out;
}

