import { readAsset } from '@/lib/ipc';
import type { ApiAnalysis, PosCode, PosFriendly, Suggestion, SuggestionVariant } from '@/types';
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

export function getMappedPos(pos: string): PosFriendly {
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

export const wordExceptions: ReadonlyArray<{ description: string, exceptionType: string, surfaces: string[] }> = [
  {
    surfaces      : ['au', 'aux', 'du', 'des'],
    exceptionType : 'article contracté',
    description   : 'Contraction obligatoire d\'une préposition (à/de) et d\'un article défini (le/les)'
  }
  // Exemples de futurs cas possibles :
  // {
  //   surfaces: ['hélas', 'zut', 'bah', 'euh', 'ouf'],
  //   exceptionType: 'interjection',
  //   description: 'Mot invariable exprimant une émotion ou une réaction'
  // },
  // {
  //   surfaces: ['meuh', 'cocorico', 'ouaf', 'miaou', 'tic-tac'],
  //   exceptionType: 'onomatopée',
  //   description: 'Mot imitant un son ou un bruit'
  // }
];

export function searchSuggestion(prefix: string): Suggestion[] {
  // 1) Exceptional exact hit first
  const exceptional = wordExceptions.find(e => e.surfaces.includes(prefix));
  if (exceptional) {
    return [{ kind: 'exceptional', result: prefix }];
  }

  // 2) Very short or empty -> exotic or nothing
  if (prefix.length <= 1) {
    return [];
  }
  if (prefix.length <= 3) {
    return [{ kind: 'exotic', result: prefix }];
  }

  // 3) Normalize; if it fails -> exotic
  const normalized = normalizeKey(prefix);
  if (!normalized) {
    return [{ kind: 'exotic', result: prefix }];
  }

  const results = new Set<string>();
  const isClean = (s: string) => /^[\p{L}’' -]+$/u.test(s);
  const collator = new Intl.Collator('fr', { usage: 'search', sensitivity: 'accent' });

  // 4) Scan lemma keys that start with the normalized prefix
  for (const lemmaKey of (lemmaToFormsCache?.keys() ?? [])) {
    if (!lemmaKey.startsWith(normalized)) {
      continue;
    }

    const forms = getFormsByLemma(lemmaKey);
    // Try to find canonical form (same key once normalized)
    const canonical = forms.find(f => normalizeKey(f) === lemmaKey);

    // Prefer canonical if it starts with the typed prefix "visually"
    if (canonical
    && collator.compare(canonical.slice(0, prefix.length), prefix) === 0
    && isClean(canonical)) {
      results.add(canonical);
      continue;
    }

    // Otherwise any form that visually starts with prefix
    const match = forms.find(f => collator.compare(f.slice(0, prefix.length), prefix) === 0 && isClean(f));
    if (match) {
      results.add(match);
    }
  }

  if (results.size > 0) {
    return Array
      .from(results)
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'accent' }))
      .map(result => ({ kind: 'lemma', result }));
  }

  // 5) Nothing found but prefix is >= 2 chars -> exotic fallback
  return [{ kind: 'exotic', result: prefix }];
}

/** Expand a suggestion into selectable variants (lemmas per POS or single exotic/exceptional). */
export function getSuggestionVariants(kind: 'lemma' | 'exceptional' | 'exotic', word: string): SuggestionVariant[] {
  if (kind === 'exceptional' || kind === 'exotic') {
    return [{
      forms : [word],
      kind,
      pos   : null,
      word
    }];
  }

  // kind === 'lemma'
  const analyses = getAnalysesByForm(word);
  // De-dupe by POS
  const byPos = new Map<string, SuggestionVariant>();

  for (const a of analyses) {
    const pos = a.pos; // keep as string
    if (byPos.has(pos)) {
      continue;
    }

    const lemmaDisplay = a.lemmaDisplay ?? a.lemma;
    const forms = getFormsByLemmaAndPos(a.lemma, pos);

    byPos.set(pos, {
      forms,
      kind : 'lemma',
      pos,
      word : lemmaDisplay
    });
  }

  return Array.from(byPos.values()).sort((x, y) => x.word.localeCompare(y.word, 'fr', { sensitivity: 'accent' }));
}


