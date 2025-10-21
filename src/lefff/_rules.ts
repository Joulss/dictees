import type { ApiAnalysis, Grammar } from '../types';
import { canonicalForm } from './helpers/normalizeKey';

/** Check if a string is in Title Case (first letter uppercase, rest lowercase). */
/**
function isTitleCase(s: string): boolean {
  if (!s) {
    return false;
  }
  const first = s.charAt(0);
  const rest = s.slice(1);
  return first === first.toLocaleUpperCase() && rest === rest.toLocaleLowerCase();
}
*/

/** Check if a POS code is a conjunction. */
/**
function isConjPos(p: PosCode): boolean {
  return p === 'coo' || p === 'csu' || p === 'prel' || p === 'pri' || p === 'que' || p === 'que_restr';
}
*/

/** Filter out noisy proper-noun readings depending on surface casing. */
/**
function filterProperNounNoise(surface: string, arr: ApiAnalysis[]): ApiAnalysis[] {
  const isTitle = isTitleCase(surface);
  let out = arr;
  if (isTitle) {
    const hasNonNp = out.some(a => a.grammar.type !== 'nom propre');
    if (hasNonNp) {
      out = out.filter(a => a.grammar.type !== 'nom propre');
    }
    return out;
  }
  return out.filter(a => a.grammar.type !== 'nom propre' || a.form === surface); // Non-TitleCase: keep NP only if the surface matches exactly
}
*/

/** Hard-coded surface-based overrides for special cases. */
/**
function applyPerFormOverrides(surface: string, arr: ApiAnalysis[]): ApiAnalysis[] {
  const s = surface.toLowerCase();
  if (s === 'faut') {
    const onlyFalloir = arr.filter(a => a.lemmaKey === 'falloir');
    if (onlyFalloir.length) {
      return onlyFalloir;
    }
  }
  return arr;
}
*/

/** Prefer auxiliary verb analyses over main verb ones when both are present. */
/**
function preferAuxiliaryVariant(arr: ApiAnalysis[]): ApiAnalysis[] {
  const hasAux = arr.some(a => a.pos === 'auxEtre' || a.pos === 'auxAvoir');
  if (!hasAux) {
    return arr;
  }
  const filtered = arr.filter(a => !(a.pos === 'v' && (a.lemmaKey === 'etre' || a.lemmaKey === 'avoir')));
  return filtered.length ? filtered : arr;
}
*/

/** Prefer conjunction analyses when the surface is a common conjunction. */
/**
function preferConjunctionWhenAvailable(surface: string, arr: ApiAnalysis[]): ApiAnalysis[] {
  const CONJ_PRIORITY_FORMS = new Set(['mais', 'ou', 'et', 'donc', 'or', 'ni', 'car', 'puis', 'que', 'si']);
  if (!CONJ_PRIORITY_FORMS.has(surface.toLowerCase())) {
    return arr;
  }
  const hasConj = arr.some(a => isConjPos(a.pos as PosCode));
  return hasConj ? arr.filter(a => isConjPos(a.pos as PosCode)) : arr;
}
*/

/** Prefer non-verb analyses where the lemma matches the surface exactly. */
/**
function preferIdentityNonVerbOverVerb(surface: string, arr: ApiAnalysis[]): ApiAnalysis[] {
  const s = normalizeKey(surface);
  const hasIdentityNonVerb = arr.some(a =>
    a.pos !== 'v' &&
  normalizeKey(a.lemma) === normalizeKey(a.form) &&
  normalizeKey(a.form) === s
  );
  if (!hasIdentityNonVerb) {
    return arr;
  }

  const filtered = arr.filter(a => a.pos !== 'v' || normalizeKey(a.lemma) === s);
  return filtered.length ? filtered : arr;
}
*/

/** Check if two strings have the same canonical form (case-insensitive). */
function sameSurface(a: string, b: string): boolean {
  return canonicalForm(a).toLowerCase() === canonicalForm(b).toLowerCase();
}

/** Prefer analyses where the form matches the surface exactly (case-insensitive). */
function preferExactFormMatch(surface: string, arr: ApiAnalysis[]): ApiAnalysis[] {
  const exact = arr.filter(a => sameSurface(a.form, surface));
  return exact.length ? exact : arr;
}

/** Stable, compact dedup key for ApiAnalysis entries. */
export function dedupKey(a: ApiAnalysis): string {
  // Avoid accented property names in key structure for safety
  return [
    a.form,
    a.lemmaKey,
    a.pos,
    a.traits ?? '',
    a.grammar.type,
    a.grammar.auxiliary ?? '',
    a.grammar.clitic ? '1' : '',
    a.grammar.role ?? '',
    a.grammar.gender ?? '',
    a.grammar.number ?? '',
    a.grammar.mood ?? '',
    a.grammar.tense ?? '',
    a.grammar.participle ?? '',
    (a.grammar.persons ?? []).join('')
  ].join('|');
}

/** Deduplicate analyses using a stable key across grammar+traits+surface. */
function dedupAnalyses(arr: ApiAnalysis[]): ApiAnalysis[] {
  const seen = new Set<string>();
  const out: ApiAnalysis[] = [];
  for (const a of arr) {
    const key = dedupKey(a);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(a);
    }
  }
  return out;
}

/** Rank grammar types according to TYPE_ORDER_ASC, unknown types get rank 99. */
function rankType(t: Grammar['type']): number {
  const TYPE_ORDER_ASC = [
    'pronom',
    'déterminant',
    'conjonction',
    'préposition',
    'adverbe',
    'verbe',
    'adjectif',
    'nom commun',
    'nom propre'
  ] as const;
  const idx = TYPE_ORDER_ASC.indexOf(t as (typeof TYPE_ORDER_ASC)[number]);
  return idx >= 0 ? idx : 99;
}

/** Sort analyses in a human-readable order (by rank of grammar type). */
export function sortHumanReadable(arr: ApiAnalysis[]): ApiAnalysis[] {
  return arr.slice().sort((a, b) => rankType(a.grammar.type) - rankType(b.grammar.type));
}


/** Post-processing rules applied to analyses for a given surface form. Not used currently, but we
 * keep it for reference.
 */
/**
export function applyPerFormRules(surface: string, analyses: ApiAnalysis[]): ApiAnalysis[] {
  let out = analyses;
  out = filterProperNounNoise(surface, out);
  out = applyPerFormOverrides(surface, out);
  out = preferAuxiliaryVariant(out);
  out = preferConjunctionWhenAvailable(surface, out);
  out = preferIdentityNonVerbOverVerb(surface, out);
  out = dedupAnalyses(out);
  out = sortHumanReadable(out);
  return out;
}
*/

/**
 * Post-processing rules applied to analyses for a given surface form.
 * These are heuristics to filter out unlikely analyses or prefer some analyses over others.
 * The order of application matters.
 * Each function takes the surface form and the current list of analyses, and returns a filtered/prioritized list.
 *
 * The functions are:
 * - preferExactFormMatch: Prefer analyses where the form matches the surface exactly (case-insensitive).
 */

export function applyPerFormRules(surface: string, analyses: ApiAnalysis[]): ApiAnalysis[] {
  let out = analyses;

  out = preferExactFormMatch(surface, out);

  out = dedupAnalyses(out);
  out = sortHumanReadable(out);
  return out;
}

