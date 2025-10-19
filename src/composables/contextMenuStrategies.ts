import type { MenuItem, SelectedWord } from '../types';
import { formatLemmaDisplay, getFormsByLemmaAndPos, getMappedPos } from './useWord';
import { getWordException } from '../lefff/exceptions';

export interface StrategyContext {
  currentMatch: SelectedWord | null;
  lemmaOptions: Array<{ lemma: string; lemmaDisplay: string; pos: string }>;
  previousMatchTitle: string | null;
  surface: string;
  token: any; // AnalyzedToken
}

export type MenuStrategy = (ctx: StrategyContext) => MenuItem[] | null;

// Retirer si déjà présent dans dictée courante
export const removeStrategy: MenuStrategy = ({ currentMatch }) => {
  if (!currentMatch) {
    return null; 
  }
  return [{ action: { type: 'remove', word: currentMatch }, label: 'Retirer de cette dictée', isDelete: true }];
};

// Hérité d'une dictée précédente
export const inheritedStrategy: MenuStrategy = ({ previousMatchTitle }) => {
  if (!previousMatchTitle) {
    return null; 
  }
  return [{ action: { type: 'info' }, label: `Hérité de "${previousMatchTitle}"`, isInherited: true }];
};

// Exceptions / exotique (pas de lemmes)
export const exoticExceptionalStrategy: MenuStrategy = ({ token, surface }) => {
  if (token.lemmas && token.lemmas.length > 0) {
    return null; 
  }
  const exceptionType = getWordException(surface);
  if (exceptionType) {
    return [{ action: { type: 'add-exceptional', surface, exceptionType }, label: `${surface} (${exceptionType})`, isExceptional: true, forms: [surface] }];
  }
  return [{ action: { type: 'add-exotic', surface }, label: `${surface} (exotique)`, isExotic: true, forms: [surface] }];
};

// Lemmes (y compris cas exceptionnel en plus)
export const lemmaStrategy: MenuStrategy = ({ token, surface, lemmaOptions }) => {
  if (!token.lemmas || token.lemmas.length === 0) {
    return null; 
  }
  const items: MenuItem[] = [];
  const exceptionType = getWordException(surface);
  if (exceptionType) {
    items.push({ action: { type: 'add-exceptional', surface, exceptionType }, label: `${surface} (${exceptionType})`, isExceptional: true, forms: [surface] });
  }
  for (const opt of lemmaOptions) {
    const forms = getFormsByLemmaAndPos(opt.lemma, opt.pos);
    items.push({ action: { type: 'add-lemma', lemma: opt.lemma, lemmaDisplay: opt.lemmaDisplay, pos: opt.pos }, label: `${formatLemmaDisplay(opt.lemmaDisplay)} (${getMappedPos(opt.pos)})`, forms });
  }
  return items;
};

export const MENU_STRATEGIES: MenuStrategy[] = [
  removeStrategy,
  inheritedStrategy,
  exoticExceptionalStrategy,
  lemmaStrategy
];

export function expandLemmasByPos(wordToken: any): Array<{ lemma: string; lemmaDisplay: string; pos: string }> {
  const options: Array<{ lemma: string; lemmaDisplay: string; pos: string }> = [];
  for (const lemmaEntry of wordToken.lemmas || []) {
    for (const pos of Array.from<string>(lemmaEntry.pos as Set<string>)) {
      options.push({ lemma: lemmaEntry.lemma, lemmaDisplay: lemmaEntry.lemmaDisplay, pos });
    }
  }
  return options;
}
