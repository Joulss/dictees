import type { ExceptionalWord, ExoticWord, LemmaWord, SelectedWord } from '../types';
import { getAnalysesByForm, getFormsByLemma } from '../lefff/repository';
import { getLemmaPosToForms } from '../lefff/assets';
import { normalizeKey } from '../lefff/helpers/normalizeKey';

// Type guards basés sur le discriminant
export function isLemmaWord(word: SelectedWord): word is LemmaWord {
  return word.kind === 'lemma';
}

export function isExoticWord(word: SelectedWord): word is ExoticWord {
  return word.kind === 'exotic';
}

export function isExceptionalWord(word: SelectedWord): word is ExceptionalWord {
  return word.kind === 'exceptional';
}

// Migration utilitaire (au cas où un mot n'a pas encore kind)
export function ensureKind(word: any): SelectedWord {
  if (word.kind) {
    return word as SelectedWord;
  }
  if ('lemma' in word && 'pos' in word) {
    return { kind: 'lemma', ...word } as LemmaWord;
  }
  if ('exceptionType' in word) {
    return { kind: 'exceptional', ...word } as ExceptionalWord;
  }
  if ('surface' in word) {
    return { kind: 'exotic', ...word } as ExoticWord;
  }
  throw new Error('Unknown word shape, cannot assign kind');
}

const formsCache = new Map<string, string[]>(); // Cache (lemma||pos) -> forms normalisées

export function getFormsByLemmaAndPos(lemma: string, pos: string): string[] {
  const keyCache = `${lemma}||${pos}`;
  const cached = formsCache.get(keyCache);
  if (cached) {
    return cached;
  }

  try {
    const lemmaPosToForms = getLemmaPosToForms();
    const key = `${normalizeKey(lemma)} ${pos}`;
    const forms = lemmaPosToForms.get(key);
    if (forms && forms.length > 0) {
      formsCache.set(keyCache, forms); // mise en cache également pour la source optimisée
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

  formsCache.set(keyCache, matchingForms);
  return matchingForms;
}

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

export function formatLemmaDisplay(lemma: string): string {
  return lemma.replace(/([?!:;])$/, ' $1');
}

export function renderWord(word: SelectedWord): string {
  if (isLemmaWord(word)) {
    return `${formatLemmaDisplay(word.lemmaDisplay)} (${getMappedPos(word.pos)})`;
  } else if (isExceptionalWord(word)) {
    return `${word.surface} (${word.exceptionType})`;
  } else {
    return word.surface;
  }
}

export function wordKey(word: SelectedWord): string {
  switch (word.kind) {
  case 'lemma': return `lemma:${word.lemma}:${word.pos}`;
  case 'exceptional': return `exceptional:${word.surface}:${word.exceptionType}`;
  case 'exotic': return `exotic:${word.surface}`;
  }
}

export function wordSignature(word: SelectedWord): string {
  switch (word.kind) {
  case 'lemma': return `L:${word.lemma}:${word.pos}`;
  case 'exceptional': return `X:${word.surface}:${word.exceptionType}`;
  case 'exotic': return `E:${word.surface}`;
  }
}

export function wordsAreEqual(w1: SelectedWord, w2: SelectedWord): boolean {
  if (w1.kind !== w2.kind) {
    return false;
  }
  if (w1.kind === 'lemma') {
    return w1.lemma === (w2 as LemmaWord).lemma && w1.pos === (w2 as LemmaWord).pos;
  }
  if (w1.kind === 'exotic') {
    return w1.surface === (w2 as ExoticWord).surface;
  }
  if (w1.kind === 'exceptional') {
    const a = w1 as ExceptionalWord; const b = w2 as ExceptionalWord;
    return a.surface === b.surface && a.exceptionType === b.exceptionType;
  }
  return false;
}
