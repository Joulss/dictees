import type { ExceptionalWord, ExoticWord, LemmaWord, SelectedWord } from '../types';
import { getAnalysesByForm, getFormsByLemma } from '../lefff/repository';
import { getLemmaPosToForms } from '../lefff/assets';
import { normalizeKey } from '../lefff/helpers/normalizeKey';

/**
 * Type guards pour les différents types de mots
 */
export function isLemmaWord(word: SelectedWord): word is LemmaWord {
  return 'lemma' in word;
}

export function isExoticWord(word: SelectedWord): word is ExoticWord {
  return 'surface' in word && !('exceptionType' in word);
}

export function isExceptionalWord(word: SelectedWord): word is ExceptionalWord {
  return 'exceptionType' in word;
}

/**
 * Récupère toutes les formes d'un lemme filtré par POS
 */
export function getFormsByLemmaAndPos(lemma: string, pos: string): string[] {
  try {
    const lemmaPosToForms = getLemmaPosToForms();
    const key = `${normalizeKey(lemma)} ${pos}`;
    const forms = lemmaPosToForms.get(key);
    if (forms && forms.length > 0) {
      return forms;
    }
  } catch (e) {
    console.warn('Impossible d\'utiliser lemmaPosToForms, fallback sur l\'ancienne méthode', e);
  }

  const allForms = getFormsByLemma(lemma);
  const matchingForms: string[] = [];

  for (const form of allForms) {
    const analyses = getAnalysesByForm(form);
    const hasMatchingPos = analyses.some(a => a.pos === pos);
    if (hasMatchingPos) {
      matchingForms.push(form);
    }
  }

  return matchingForms;
}

/**
 * Mapping des codes POS vers des libellés lisibles
 */
export function getMappedPos(pos: string): string {
  const posMap: Record<string, string> = {
    'nc'    : 'nom commun',
    'np'    : 'nom propre',
    'adj'   : 'adjectif',
    'det'   : 'déterminant',
    'v'     : 'verbe',
    'adv'   : 'adverbe',
    'prep'  : 'préposition',
    'pres'  : 'présentatif',
    'coo'   : 'conjonction',
    'csu'   : 'conjonction',
    'pro'   : 'pronom',
    'pri'   : 'pronom interrogatif',
    'cla'   : 'pronom',
    'cld'   : 'pronom',
    'cln'   : 'pronom',
    'clr'   : 'pronom',
    'clg'   : 'pronom',
    'cll'   : 'pronom',
    'ilimp' : 'pronom impersonnel',
    'caimp' : 'pronom démonstratif'
  };
  return posMap[pos] || pos;
}

/**
 * Formate le lemme pour l'affichage en ajoutant un espace avant les caractères spéciaux
 */
export function formatLemmaDisplay(lemma: string): string {
  return lemma.replace(/([?!:;])$/, ' $1');
}

/**
 * Rend un mot sous forme de chaîne affichable
 */
export function renderWord(word: SelectedWord): string {
  if (isLemmaWord(word)) {
    return `${formatLemmaDisplay(word.lemmaDisplay)} (${getMappedPos(word.pos)})`;
  } else if (isExceptionalWord(word)) {
    return `${word.surface} (${word.exceptionType})`;
  } else {
    return word.surface;
  }
}

/**
 * Génère une clé unique pour un mot (utile pour v-for)
 */
export function wordKey(word: SelectedWord): string {
  if (isLemmaWord(word)) {
    return `lemma:${word.lemma}:${word.pos}`;
  } else if (isExceptionalWord(word)) {
    return `exceptional:${word.surface}:${word.exceptionType}`;
  } else {
    return `exotic:${word.surface}`;
  }
}

/**
 * Compare deux mots pour déterminer s'ils sont égaux
 */
export function wordsAreEqual(w1: SelectedWord, w2: SelectedWord): boolean {
  if (isLemmaWord(w1) && isLemmaWord(w2)) {
    return w1.lemma === w2.lemma && w1.pos === w2.pos;
  }
  if (isExoticWord(w1) && isExoticWord(w2)) {
    return w1.surface === w2.surface;
  }
  if (isExceptionalWord(w1) && isExceptionalWord(w2)) {
    return w1.surface === w2.surface && w1.exceptionType === w2.exceptionType;
  }
  return false;
}
