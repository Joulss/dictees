import type { ApiAnalysis, PosCode, ResultEntry } from '../types';
import { decodeGrammar } from './decoder';
import { normalizeKey } from './helpers/normalizeKey';

function isClitic(pos: PosCode): boolean {
  return pos === 'cla'
  || pos === 'cld'
  || pos === 'cln'
  || pos === 'clr'
  || pos === 'clg'
  || pos === 'cll'
  || pos === 'ilimp'
  || pos === 'caimp';
}

function isDeterminer(pos: PosCode): boolean {
  return pos === 'det';
}

function enrichEntry(entry: ResultEntry): ApiAnalysis {
  const grammar = decodeGrammar(entry.pos, entry.traits);

  let lemmaDisplay: string | undefined;

  // Unified rule: display the actual surface for clitics or determiners
  if (isClitic(entry.pos) || isDeterminer(entry.pos)) {
    lemmaDisplay = entry.form;
  } else {
    lemmaDisplay = undefined;
  }

  return {
    form     : entry.form,
    grammar,
    lemma    : entry.lemma,
    lemmaDisplay,
    lemmaKey : entry.lemmaKey ?? normalizeKey(entry.lemma),
    pos      : entry.pos,
    traits   : entry.traits || undefined
  };
}

export function enrichEntries(entries: ResultEntry[]): ApiAnalysis[] {
  return entries.map(enrichEntry);
}
