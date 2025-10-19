import { computed, type ComputedRef, type MaybeRefOrGetter, ref, type Ref, toValue } from 'vue';
import type { AnalyzeResult, Dictation, MenuItem, MenuItemAction, SelectedWord } from '../types';
import { formatLemmaDisplay, getFormsByLemmaAndPos, getMappedPos, isExceptionalWord, isExoticWord, isLemmaWord } from './useWord';
import { getWordException } from '../lefff/exceptions';
import { normalizeKey } from '../lefff/helpers/normalizeKey';

interface ContextMenuParams {
  allDictations: MaybeRefOrGetter<Dictation[]>
  analysis: Ref<AnalyzeResult | null>
  analyzedText: Ref<string>
  currentDictation: MaybeRefOrGetter<Dictation>
  selectedWords: Ref<SelectedWord[]>
}

/**
 * Trouve un mot correspondant dans une liste de mots
 */
function findMatchingWordInList(wordList: SelectedWord[], normalizedSurface: string): SelectedWord | null {
  for (const word of wordList) {
    if (isExoticWord(word) || isExceptionalWord(word)) {
      if (normalizeKey(word.surface) === normalizedSurface) {
        return word;
      }
    } else if (isLemmaWord(word)) {
      const forms = getFormsByLemmaAndPos(word.lemma, word.pos);
      const normalizedForms = new Set(forms.map(f => normalizeKey(f)));
      if (normalizedForms.has(normalizedSurface)) {
        return word;
      }
    }
  }
  return null;
}

/**
 * Calcule l'offset dans le texte original à partir d'un clic dans le DOM
 */
function getTextOffsetFromClick(container: Element, e: MouseEvent): number | null {
  const range = document.caretRangeFromPoint(e.clientX, e.clientY);
  if (!range) {
    return null;
  }

  let node = range.startContainer;
  let offset = range.startOffset;

  if (node.nodeType !== Node.TEXT_NODE) {
    if (node.childNodes.length > 0 && offset < node.childNodes.length) {
      const childNode = node.childNodes[offset];
      if (childNode.nodeType === Node.TEXT_NODE) {
        node = childNode;
        offset = 0;
      } else if (childNode.firstChild && childNode.firstChild.nodeType === Node.TEXT_NODE) {
        node = childNode.firstChild;
        offset = 0;
      }
    }
  }

  if (node.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  let textOffset = 0;
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode === node) {
      return textOffset + offset;
    }
    textOffset += currentNode.textContent?.length || 0;
    currentNode = walker.nextNode();
  }

  return null;
}

/**
 * # useContextMenu
 *
 * Composable pour gérer le menu contextuel sur les mots
 */
export function useContextMenu({
  analysis,
  analyzedText,
  selectedWords,
  allDictations: allDictationsInput,
  currentDictation: currentDictationInput
}: ContextMenuParams) {

  // Convertir les entrées en computed pour la réactivité
  const allDictations = computed(() => toValue(allDictationsInput));
  const currentDictation = computed(() => toValue(currentDictationInput));

  const contextMenu = ref<{ items: MenuItem[]; position: { x: number; y: number }; visible: boolean }>({
    visible  : false,
    position : { x: 0, y: 0 },
    items    : []
  });

  /* Éclate les lemmes groupés en options distinctes par POS */
  function expandLemmasByPos(wordToken: NonNullable<typeof analysis.value>['tokens'][0]) {
    const options: Array<{ lemma: string; lemmaDisplay: string; pos: string }> = [];

    for (const lemmaEntry of wordToken.lemmas || []) {
      for (const pos of Array.from(lemmaEntry.pos)) {
        options.push({
          lemma        : lemmaEntry.lemma,
          lemmaDisplay : lemmaEntry.lemmaDisplay,
          pos          : pos
        });
      }
    }
    return options;
  }

  /* Trouve un mot dans les dictées précédentes */
  function findWordInPreviousDictations(normalizedSurface: string): { dictationTitle: string; word: SelectedWord } | null {
    const currentDate = new Date(currentDictation.value.createdAt);
    for (const dictation of allDictations.value) {
      const dictDate = new Date(dictation.createdAt);
      if (dictDate >= currentDate) {
        continue;
      }
      const matchedWord = findMatchingWordInList(dictation.selectedWords, normalizedSurface);
      if (matchedWord) {
        return {
          word           : matchedWord,
          dictationTitle : dictation.title
        };
      }
    }
    return null;
  }

  /* Construit les items du menu contextuel pour un token */
  function buildContextMenuItems(token: NonNullable<typeof analysis.value>['tokens'][0], surface: string): MenuItem[] {
    const items: MenuItem[] = [];
    const normalizedSurface = normalizeKey(surface);

    const currentWordMatch = findMatchingWordInList(selectedWords.value, normalizedSurface);

    if (currentWordMatch) {
      items.push({
        action   : { type: 'remove', word: currentWordMatch },
        label    : 'Retirer de cette dictée',
        isDelete : true
      });
      return items;
    }

    const previousDictation = findWordInPreviousDictations(normalizedSurface);

    if (previousDictation) {
      items.push({
        action      : { type: 'info' },
        label       : `Hérité de "${previousDictation.dictationTitle}"`,
        isInherited : true
      });
      return items;
    }

    const exceptionType = getWordException(surface);

    if (!token.lemmas || token.lemmas.length === 0) {
      if (exceptionType) {
        items.push({
          action        : { type: 'add-exceptional', surface, exceptionType },
          label         : `${surface} (${exceptionType})`,
          isExceptional : true,
          forms         : [surface]
        });
      } else {
        items.push({
          action   : { type: 'add-exotic', surface },
          label    : `${surface} (exotique)`,
          isExotic : true,
          forms    : [surface]
        });
      }
    } else {
      if (exceptionType) {
        items.push({
          action        : { type: 'add-exceptional', surface, exceptionType },
          label         : `${surface} (${exceptionType})`,
          isExceptional : true,
          forms         : [surface]
        });
      }

      const options = expandLemmasByPos(token);
      for (const option of options) {
        const forms = getFormsByLemmaAndPos(option.lemma, option.pos);

        items.push({
          action: {
            type         : 'add-lemma',
            lemma        : option.lemma,
            lemmaDisplay : option.lemmaDisplay,
            pos          : option.pos
          },
          label : `${formatLemmaDisplay(option.lemmaDisplay)} (${getMappedPos(option.pos)})`,
          forms : forms
        });
      }
    }

    return items;
  }

  /* Affiche le menu contextuel */
  function show(e: MouseEvent, container: Element) {
    e.preventDefault();

    if (!analysis.value) {
      close();
      return;
    }

    const clickOffset = getTextOffsetFromClick(container, e);

    if (clickOffset === null) {
      close();
      return;
    }

    const token = analysis.value.tokens.find(t =>
      t.isWord && clickOffset >= t.start && clickOffset < t.end
    );

    if (!token) {
      close();
      return;
    }

    const surface = analyzedText.value.substring(token.start, token.end);
    const menuItems = buildContextMenuItems(token, surface);

    if (menuItems.length > 0) {
      contextMenu.value = {
        visible  : true,
        position : { x: e.clientX, y: e.clientY },
        items    : menuItems
      };
    } else {
      close();
    }
  }

  /* Ferme le menu contextuel */
  function close() {
    contextMenu.value.visible = false;
  }

  /* Gère une action du menu contextuel */
  function handleAction(action: MenuItemAction) {
    return action;
  }


  return {
    contextMenu,
    show,
    close,
    handleAction
  };
}
