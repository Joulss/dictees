import type { InjectionKey } from 'vue';

/**
 * # Database
 */



/**
 * # Lefff / Grammar Types
 */

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

export type PosCode =
| 'v'
| 'nc'
| 'adj'
| 'adv'
| 'det'
| 'pro'
| 'cla'
| 'cld'
| 'cln'
| 'clr'
| 'clg'
| 'cll'
| 'prep'
| 'coo'
| 'csu'
| 'prel'
| 'pres'
| 'pri'
| 'que'
| 'que_restr'
| 'np'
| 'auxEtre'
| 'auxAvoir'
| 'ilimp'
| 'caimp';

export enum PosFriendlyEnum {
  AUXILIARY_VERB = 'verbe auxiliaire',
  VERB = 'verbe',
  NOUN = 'nom commun',
  ADJECTIVE = 'adjectif',
  ADVERB = 'adverbe',
  DETERMINER = 'déterminant',
  PRONOUN = 'pronom',
  INTERROGATIVE_PRONOUN = 'pronom interrogatif',
  DEMONSTRATIVE_PRONOUN = 'pronom démonstratif',
  IMPERSONAL_PRONOUN = 'pronom impersonnel',
  RELATIVE_PRONOUN = 'pronom relatif',
  PREPOSITION = 'préposition',
  CONJUNCTION = 'conjonction',
  PROPER_NOUN = 'nom propre',
  PRESENTATIVE = 'présentatif',
  OTHER = 'autre'
}

export type PosFriendly = PosFriendlyEnum;


/**
 * # Lefff Analysis API Types
 */

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
  start: number;
  text: string;
};

export interface AnalyzedToken extends Token {
  ambiguous?: boolean;
  analyses?: ApiAnalysis[];
  found?: boolean;
  lemmas?: DictLemma[];
}

export interface ApiAnalysis {
  form: string;
  grammar: Grammar;
  lemma: string;
  lemmaDisplay?: string;
  lemmaKey: string;
  pos: PosCode;
  traits?: string;
}

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

export interface DictLemma {
  grammar: Grammar;
  lemma: string;
  lemmaDisplay: string;
  lemmaKey: string;
  pos: Set<string>;
}

/**
 * # Domain
 */

export interface Dictation {
  createdAt: string
  kind: 'dictation'
  text: string
  title: string
}

export interface List {
  createdAt: string
  kind: 'list'
  title: string
  words: (LemmaWord | ExceptionalWord | ExoticWord)[]
}

export type Feed = (Dictation | List)[]

export type FeedObject = Dictation | List

export interface UserDb {
  feed: FeedObject[]
}

export interface LemmaWord {
  kind: 'lemma'
  pos: PosCode
  word: string
}

export interface ExoticWord {
  kind: 'exotic'
  word: string
}

export interface ExceptionalWord {
  kind: 'exceptional'
  word: string
}

export interface LemmaWithForms extends LemmaWord {
  forms: string[]
}



/**
 * # UI - Toasts
 */

export enum ToastTypeEnum {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export type ToastType = ToastTypeEnum

export interface Toast {
  id?: string;
  message?: string;
  status?: ToastType;
  title?: string;
  type?: ToastType;
}

// export const SHOW_TOAST_KEY = Symbol('showToast') as InjectionKey<ShowToastFn>;
