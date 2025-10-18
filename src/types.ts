/**
 * # Words
 */

export type LemmaWord = {
  lemma: string;
  lemmaDisplay: string;
  pos: string; // Un seul POS, pas un tableau
};

export type ExoticWord = {
  surface: string; // Le mot tel qu'il apparaît dans le texte
};

export type SelectedWord = LemmaWord | ExoticWord;

export type Word = {
  form: string
  lemma: string
  pos: PosCode
  traits?: string
};

export interface BaseWord { // Mot du pool de base
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
  color?: string // couleur figée (étape 2)
  createdAt: string // ISO (sert d'ID)
  date: string // fr-FR (affichage)
  selectedWords: SelectedWord[] // mots rattachés à cette dictée
  text: string // texte intégral
  title: string // ex: "15/10/2025"
}

/**
 * # Database
 */

export interface UserDb {
  baseWords: BaseWord[] // pool de mots de base
  dictees: Dictation[] // on garde "dictees" (fr) pour la liste des dictées
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
  pos: PosCode; // Will become PosCode once LEFFF typing is fully migrated
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
