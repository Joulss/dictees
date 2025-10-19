import { normalizeKey } from '../lefff/helpers/normalizeKey';
import { getFormsByLemmaAndPos } from './useWord';

// Cache des formes par (lemma,pos)
const lemmaPosCache = new Map<string, Set<string>>();

export function getNormalizedFormsForWord(word: SelectedWord): Set<string> {
  if (word.kind === 'lemma') {
    const key = `${word.lemma}||${word.pos}`;
    const cached = lemmaPosCache.get(key);
    if (cached) {
      return cached;
    }
    const forms = getFormsByLemmaAndPos(word.lemma, word.pos);
    const set = new Set(forms.map(f => normalizeKey(f)));
    lemmaPosCache.set(key, set);
    return set;
  }
  if (word.kind === 'exotic' || word.kind === 'exceptional') {
    return new Set([normalizeKey(word.surface)]);
  }
  return new Set();
}

export interface WordDescriptor {
  color: string;
  dictationId: string;
  fontColor: string;
  forms: Set<string>;
  isCurrent: boolean;
  opacity: number;
  word: SelectedWord;
}

export function buildWordDescriptors(allDictations: Dictation[], current: Dictation, selectedCurrent: SelectedWord[]): WordDescriptor[] {
  const list: WordDescriptor[] = [];
  const currentDate = new Date(current.createdAt);

  for (const dictation of allDictations) {
    const dictDate = new Date(dictation.createdAt);
    if (dictDate > currentDate) {
      continue; // ignorer les dictées futures
    }
    const isCurrent   = dictation.createdAt === current.createdAt;
    const sourceWords = isCurrent ? selectedCurrent : dictation.selectedWords;
    for (const w of sourceWords) {
      list.push({
        word        : w,
        forms       : getNormalizedFormsForWord(w),
        color       : dictation.color || '#999',
        opacity     : isCurrent ? 1 : 0.15,
        fontColor   : isCurrent ? '#fff' : '#333',
        dictationId : dictation.createdAt,
        isCurrent   : isCurrent
      });
    }
  }
  return list;
}
