/**
 * # Words
 */

export type LemmaWord = {
  lemma: string;
  lemmaDisplay: string;
  pos: string;
};

export type ExoticWord = {
  surface: string;
};

export type ExceptionalWord = {
  exceptionType: string; // "article contracté", "interjection", "onomatopée", etc.
  surface: string;
};

export type SelectedWord = LemmaWord | ExoticWord | ExceptionalWord;

export type Word = {
  form: string
  lemma: string
  pos: PosCode
  traits?: string
};

export interface BaseWord {
  firstDictationId?: string // createdAt de la première dictée qui l'a intégré
  integrated: boolean // a-t-il été intégré dans au moins une dictée ?
  word: Word
}

/**
 * # Dictations
 */

export interface NewDictation {
  color: string
  text: string
  title: string
}

export interface Dictation {
  color?: string
  createdAt: string
  date: string
  selectedWords: SelectedWord[]
  text: string
  title: string
}

/**
 * # Database
 */

export interface UserDb {
  baseWords: BaseWord[]
  dictees: Dictation[]
}

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
 * # LEFFF Types
 */

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
| 'pri'
| 'que'
| 'que_restr'
| 'np'
| 'auxEtre'
| 'auxAvoir'
| 'ilimp'
| 'caimp';

/** One LEFFF analysis entry for a given surface form. */
export type LefffEntry = {
  form: string; // canonical surface form (accented) for display
  lemma: string; // canonical lemma (accented) for display
  pos: PosCode; // LEFFF POS code
  traits?: string;
};

/** Internal: a LEFFF entry plus its normalized lemma key. */
export type ResultEntry = LefffEntry & { lemmaKey: string };

/** JSON map: normalized surface form → list of analyses. */
export type LefffFormToAnalyses = Record<string, LefffEntry[]>;

/** JSON map: normalized lemma → list of canonical surface forms. */
export type LefffLemmaToForms = Record<string, string[]>;

/**
 * # Grammar Types
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

/**
 * # Context Menu Types
 */

export type MenuItemAction =
  | { lemma: string; lemmaDisplay: string; pos: string; type: 'add-lemma' }
  | { surface: string; type: 'add-exotic'; }
  | { exceptionType: string; surface: string; type: 'add-exceptional'; }
  | { type: 'remove'; word: LemmaWord | ExoticWord | ExceptionalWord }
  | { type: 'info' };

export interface MenuItem {
  action: MenuItemAction;
  forms?: string[];
  isDelete?: boolean;
  isExotic?: boolean;
  isExceptional?: boolean;
  isInherited?: boolean;
  label: string;
}
