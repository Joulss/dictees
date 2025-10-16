import { z } from 'zod';
import type {PosCode} from './lefff/types';

/**
 * Global domain & API contracts (LEFFF-agnostic).
 * Keep these types stable and independent from data-source specifics.
 */

/* ===================== Zod Schemas ===================== */

export const DictationSchema = z.object({
  createdAt : z.string(),
  id        : z.string(),
  text      : z.string(),
  title     : z.string(),
  updatedAt : z.string()
});

export const WordSchema = z.object({
  createdAt : z.string(),
  id        : z.string(),
  lemma     : z.string(),
  pos       : z.string()
});

export const DbSchema = z.object({
  dictees : z.array(DictationSchema),
  words   : z.array(WordSchema)
});

/* ===================== Inferred DB Types ===================== */

export type DbData = z.infer<typeof DbSchema>;
export type Dictation = z.infer<typeof DictationSchema>;
export type Word = z.infer<typeof WordSchema>;

/* ===================== Analysis Types (API) ===================== */

export type AnalyzeResult = {
  stats: AnalyzeStats;
  tokens: AnalyzedToken[];
};

export type AnalyzeStats = {
  ambiguousWords: number;
  foundWords: number;
  known: number;
  totalWords: number;
  uniqueLemmas: number;
};

export type Token = {
  end: number;
  isWord: boolean;
  known: boolean;
  lemma: string | null;
  start: number;
  text: string;
};

export interface AnalyzedToken extends Token {
  ambiguous?: boolean;
  analyses?: ApiAnalysis[];
  found?: boolean;
  lemmas?: string[];
}

export type ResolveResult = {
  analyses: ApiAnalysis[];
  found: boolean;
  word: string;
};

export interface ApiAnalysis {
  form: string;
  grammar: Grammar;
  lemma: string;
  lemmaDisplay?: string;
  lemmaKey: string;
  pos: PosCode; // Will become PosCode once LEFFF typing is fully migrated
  traits?: string;
}

/** Compact analysis for UI. Optionally embeds raw fields in verbose mode. */
export type UiAnalysis = {
  form: string;
  grammar: Grammar;
  lemmaDisplay?: string;
  lemmaKey: string;
  raw?: { /** Present only when verbose=true */
    lemma: string;
    pos: string;
    traits?: string;
  };
};

export type UiToken = {
  ambiguous?: boolean;
  analyses?: UiAnalysis[];
  end: number;
  found: boolean;
  isWord: boolean;
  known: boolean;
  lemmas?: string[];
  start: number;
  text: string;
};

export type AnalyzeResultDTO = {
  stats: {
    ambiguousWords: number;
    foundWords: number;
    known: number;
    totalWords: number;
    uniqueLemmas: number;
  };
  tokens: UiToken[];
};

/* ===================== Grammar (structured, LEFFF-agnostic) ===================== */

export type Gender = 'masculin' | 'féminin';

export type GrammaticalNumber = 'singulier' | 'pluriel';

export type Mood =
| 'indicatif'
| 'subjonctif'
| 'impératif'
| 'infinitif'
| 'participe'
| 'gérondif'
| 'conditionnel';

export type Participle = 'passé' | 'présent';

export type SimpleTense = 'présent' | 'imparfait' | 'futur' | 'passé simple';

export type PronounRole =
| 'sujet'
| 'objet direct'
| 'objet indirect'
| 'réfléchi'
| 'adverbial'
| 'impersonnel';

export type WordType =
| 'verbe'
| 'nom commun'
| 'adjectif'
| 'adverbe'
| 'déterminant'
| 'pronom'
| 'préposition'
| 'conjonction'
| 'nom propre'
| 'autre';

export type Grammar = {
  auxiliary?: 'être' | 'avoir';
  clitic?: boolean;
  gender?: Gender;
  mood?: Mood;
  number?: GrammaticalNumber;
  participle?: Participle;
  persons?: number[];
  role?: PronounRole;
  tense?: SimpleTense;
  type: WordType;
};
