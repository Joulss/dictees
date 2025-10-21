// src/lefff/analyzeService.ts
// All comments in English. This mirrors the Express version closely.

import type { AnalyzedToken, AnalyzeResult, AnalyzeStats, ApiAnalysis, DictLemma } from '../types';
import { tokenize } from './helpers/tokenize';
import { getAnalysesByForm } from './repository';
import { enrichEntries } from './enrich';
import { applyPerFormRules } from './rules';
import { APOST_CLASS } from './helpers/apostropheClass';
import { getFeed } from '../lib/userDb';
import { normalizeKey } from './helpers/normalizeKey';

/**
 * Return base candidates for a left-elided segment (lowercased, without apostrophe).
 * Example: "qu" → ["que"], "l" → ["le","la"]
 */
export function elidedBasesFor(leftWithoutAposLower: string): string[] {
  const ELISION_BASE: Record<string, string | string[]> = {
    c      : 'ce',
    d      : 'de',
    j      : 'je',
    l      : ['le', 'la'],
    m      : 'me',
    n      : 'ne',
    s      : 'se',
    t      : 'te',
    qu     : 'que',
    lorsqu : 'lorsque',
    puisqu : 'puisque',
    quoiqu : 'quoique',
    presqu : 'presque'
  };
  const base = ELISION_BASE[leftWithoutAposLower];
  if (!base) {
    return [];
  }
  return Array.isArray(base) ? base : [base];
}

/** Resolve analyses for multiple base candidates (left-elision), then enrich + rules. */
async function resolveForElidedBases(surface: string, bases: string[]): Promise<ApiAnalysis[]> {
  const raw: ApiAnalysis[] = [];
  for (const base of bases) {
    // In our Tauri build, getAnalysesByForm already returns ApiAnalysis objects
    // enriched with grammar at asset load time. We still call enrichEntries to
    // preserve any extra fields (e.g. lemmaDisplay) from your original pipeline.
    const entries = getAnalysesByForm(base);
    const mapped = enrichEntries(entries);
    raw.push(...mapped);
  }
  return applyPerFormRules(surface, raw);
}

/** Resolve for a plain surface, then enrich + rules. */
async function resolveForSurface(surface: string): Promise<ApiAnalysis[]> {
  const entries = getAnalysesByForm(surface);
  const mapped = enrichEntries(entries);
  return applyPerFormRules(surface, mapped);
}

/** If the token text matches a left-elision pattern, return possible bases (lowercased). */
export function getElidedBasesFromWordTokenText(text: string): string[] {
  const re = new RegExp(String.raw`^(\p{L}+)\s*${APOST_CLASS}$`, 'u');
  const m = re.exec(text);
  if (m?.[1] === undefined) {
    return [];
  }
  const left = m[1].toLowerCase();
  return elidedBasesFor(left);
}



export async function analyzeText(text: string): Promise<AnalyzeResult> {

  const { tokens } = tokenize(text);

  const db            = await getFeed();
  const wordsArray    = Array.isArray(db?.baseWords) ? db.baseWords : [];
  const knownLemmaSet = new Set<string>(
    wordsArray
      .map((w: any) => normalizeKey(String(w?.lemma ?? w?.surface ?? '')))
      .filter(Boolean)
  );

  let totalWords     = 0;
  let foundWords     = 0;
  let ambiguousWords = 0;
  let knownCount     = 0;

  const uniqueLemmas = new Set<string>();

  const analyzed: AnalyzedToken[] = [];

  for (const t of tokens) {
    const isElision = /^[ldjmnstq][’'`´]$/i.test(t.text);

    if (!t.isWord || isElision) {
      analyzed.push({
        end    : t.end,
        isWord : false,
        known  : false,
        start  : t.start,
        text   : t.text,
        lemmas : []
      });
      continue;
    }

    totalWords += 1;

    const elidedBases = getElidedBasesFromWordTokenText(t.text);
    const analyses = elidedBases.length > 0
      ? await resolveForElidedBases(t.text, elidedBases)
      : await resolveForSurface(t.text);

    if (analyses.length > 0) {

      const lemmaMap = new Map<string, DictLemma>();

      for (const analysis of analyses) {
        const display = analysis.lemmaDisplay || analysis.lemma;
        const key = `${analysis.lemmaKey}|${display}`;

        if (lemmaMap.has(key)) {
          lemmaMap.get(key)!.pos.add(analysis.pos);
        } else {
          lemmaMap.set(key, {
            lemma        : analysis.lemma,
            lemmaKey     : analysis.lemmaKey,
            lemmaDisplay : display,
            pos          : new Set([analysis.pos]),
            grammar      : analysis.grammar
          });
        }
        uniqueLemmas.add(display);
      }

      const lemmas = Array.from(lemmaMap.values());
      const grammarTypes = new Set(analyses.map(analysis => analysis.grammar.type));
      const isAmbiguous = analyses.length > 1 || grammarTypes.size > 1;

      // On vérifie la connaissance via le premier lemme représentatif
      const representative = lemmas[0]?.lemmaDisplay ?? lemmas[0]?.lemma ?? null;
      const nkLemma = representative ? normalizeKey(representative) : null;
      const isKnown = nkLemma ? knownLemmaSet.has(nkLemma) : false;

      analyzed.push({
        ambiguous : isAmbiguous,
        analyses,
        end       : t.end,
        found     : true,
        isWord    : true,
        known     : isKnown,
        lemmas,
        start     : t.start,
        text      : t.text
      });

      foundWords += 1;
      if (isAmbiguous) {
        ambiguousWords += 1;
      }
      if (isKnown) {
        knownCount += 1;
      }

    } else {

      const nkSurface = normalizeKey(t.text);
      const isKnown = knownLemmaSet.has(nkSurface);

      analyzed.push({
        ambiguous : false,
        analyses  : [],
        end       : t.end,
        found     : false,
        isWord    : true,
        known     : isKnown,
        lemmas    : [],
        start     : t.start,
        text      : t.text
      });

      if (isKnown) {
        knownCount += 1;
      }
    }
  }

  const stats: AnalyzeStats = {
    ambiguousWords,
    foundWords,
    known        : knownCount,
    totalWords,
    uniqueLemmas : uniqueLemmas.size
  };

  return {
    stats,
    tokens: analyzed
  };
}
