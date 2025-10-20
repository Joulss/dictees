import type { AnalyzedToken, MenuItem, SelectedWord } from '../types';
import { formatLemmaDisplay, getFormsByLemmaAndPos, getMappedPos } from './useWord';
import { getWordException } from '../lefff/exceptions';

export interface StrategyContext {
  currentMatch: SelectedWord | null;
  lemmaOptions: Array<{ lemma: string; lemmaDisplay: string; pos: string }>;
  previousMatchTitle: string | null;
  selectedLemmaByKey: Map<string, SelectedWord>; // key = `${lemma}::${pos}`
  selectedSurfaceWord: SelectedWord | null; // surface-based selection if any (normalized match)
  surface: string;
  token: AnalyzedToken;
}

export type MenuStrategy = (ctx: StrategyContext) => MenuItem[] | null;

// Remove only for surface-based selections (exotic/exception added as "surface")
export const removeStrategy: MenuStrategy = ({ selectedSurfaceWord }) => {
  if (!selectedSurfaceWord) {
    return null;
  }
  return [{
    action   : { type: 'remove', word: selectedSurfaceWord },
    isDelete : true,
    label    : 'Retirer de cette dictée'
  }];
};

// Hérité d'une dictée précédente
export const inheritedStrategy: MenuStrategy = ({ previousMatchTitle }) => {
  if (!previousMatchTitle) {
    return null;
  }
  return [{
    action      : { type: 'info' },
    isInherited : true,
    label       : `Hérité de "${previousMatchTitle}"`
  }];
};

// Exceptions / exotique (pas de lemmes)
export const exoticExceptionalStrategy: MenuStrategy = ({ token, surface, selectedSurfaceWord, previousMatchTitle }) => {
  // Déjà présent localement → on ne propose pas d’ajout ici (removeStrategy s'en charge)
  if (selectedSurfaceWord) {
    return null;
  }

  // Hérité d'une dictée précédente → pas d'ajout exotique/exceptionnel
  if (previousMatchTitle) {
    return null;
  }

  // S'il y a des lemmes, on ne propose l'exceptionnel que si c'est un vrai cas exceptionnel
  if (token.lemmas && token.lemmas.length > 0) {
    const exceptionType = getWordException(surface);
    if (!exceptionType) {
      return null;
    }
    return [{
      action        : { type: 'add-exceptional', surface, exceptionType },
      forms         : [surface],
      isExceptional : true,
      label         : `${surface} (${exceptionType})`
    }];
  }

  // Pas de lemmes → exotique (ou exceptionnel si applicable)
  const exceptionType = getWordException(surface);
  if (exceptionType) {
    return [{
      action        : { type: 'add-exceptional', surface, exceptionType },
      forms         : [surface],
      isExceptional : true,
      label         : `${surface} (${exceptionType})`
    }];
  }
  return [{
    action   : { type: 'add-exotic', surface },
    forms    : [surface],
    isExotic : true,
    label    : `${surface} (exotique)`
  }];
};



// Lemmes : toujours 1 entrée par option (toggle add/remove selon sélection courante)
export const lemmaStrategy: MenuStrategy = ({ token, lemmaOptions, selectedLemmaByKey, previousMatchTitle }) => {
  if (!token.lemmas || token.lemmas.length === 0) {
    return null;
  }

  const items: MenuItem[] = [];

  // Si hérité → on n'affiche PAS d'entrées d'ajout.
  // Mais on continue d'afficher les "Retirer ..." pour les (lemma,pos) déjà présents localement.
  const blockAdds = Boolean(previousMatchTitle);

  for (const opt of lemmaOptions) {
    const key = `${opt.lemma}::${opt.pos}`;
    const already = selectedLemmaByKey.get(key);

    if (already) {
      items.push({
        action   : { type: 'remove', word: already },
        isDelete : true,
        label    : `Retirer ${formatLemmaDisplay(opt.lemmaDisplay)} (${getMappedPos(opt.pos)})`
      });
    } else if (!blockAdds) {
      const forms = getFormsByLemmaAndPos(opt.lemma, opt.pos);
      items.push({
        action : { type: 'add-lemma', lemma: opt.lemma, lemmaDisplay: opt.lemmaDisplay, pos: opt.pos },
        forms,
        label  : `${formatLemmaDisplay(opt.lemmaDisplay)} (${getMappedPos(opt.pos)})`
      });
    }
  }

  return items;
};


export const MENU_STRATEGIES: MenuStrategy[] = [
  removeStrategy,
  inheritedStrategy,
  exoticExceptionalStrategy,
  lemmaStrategy
];

export function expandLemmasByPos(wordToken: AnalyzedToken): Array<{ lemma: string; lemmaDisplay: string; pos: string }> {
  const options: Array<{ lemma: string; lemmaDisplay: string; pos: string }> = [];
  for (const lemmaEntry of wordToken.lemmas || []) {
    for (const pos of Array.from<string>(lemmaEntry.pos)) {
      options.push({ lemma: lemmaEntry.lemma, lemmaDisplay: lemmaEntry.lemmaDisplay, pos });
    }
  }
  return options;
}
