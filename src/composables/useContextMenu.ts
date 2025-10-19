import { computed, type MaybeRefOrGetter, ref, type Ref, toValue } from 'vue';
import type { AnalyzeResult, Dictation, MenuItem, MenuItemAction, SelectedWord } from '../types';
import { formatLemmaDisplay, getFormsByLemmaAndPos, getMappedPos } from './useWord';
import { getWordException } from '../lefff/exceptions';
import { normalizeKey } from '../lefff/helpers/normalizeKey';
import { expandLemmasByPos, MENU_STRATEGIES } from './contextMenuStrategies';

interface ContextMenuParams {
  allDictations: MaybeRefOrGetter<Dictation[]>
  analysis: Ref<AnalyzeResult | null>
  analyzedText: Ref<string>
  currentDictation: MaybeRefOrGetter<Dictation>
  selectedWords: Ref<SelectedWord[]>
}

interface WordIndexEntry {
  word: SelectedWord;
  dictTitle?: string; // absent si current
  forms: Set<string>; // normalized forms
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

function buildWordIndex(current: Dictation, all: Dictation[], selected: SelectedWord[]): { current: WordIndexEntry[]; previous: WordIndexEntry[] } {
  const currentDate = new Date(current.createdAt);
  const currentEntries: WordIndexEntry[] = selected.map(w => ({ word: w, forms: getFormsSet(w) }));
  const previousEntries: WordIndexEntry[] = [];
  for (const d of all) {
    const dDate = new Date(d.createdAt);
    if (dDate >= currentDate) {
      continue;
    }
    for (const w of d.selectedWords) {
      previousEntries.push({ word: w, dictTitle: d.title, forms: getFormsSet(w) });
    }
  }
  return { current: currentEntries, previous: previousEntries };
}

function getFormsSet(word: SelectedWord): Set<string> {
  if (word.kind === 'lemma') {
    const forms = getFormsByLemmaAndPos(word.lemma, word.pos);
    return new Set(forms.map(f => normalizeKey(f)));
  }
  return new Set([normalizeKey(word.surface)]);
}

function findInIndex(index: WordIndexEntry[], normalizedSurface: string): WordIndexEntry | null {
  for (const entry of index) {
    if (entry.forms.has(normalizedSurface)) {
      return entry;
    }
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
  const wordIndex = computed(() => buildWordIndex(currentDictation.value, allDictations.value, selectedWords.value));

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

  /* Construit les items du menu contextuel pour un token */
  function buildContextMenuItems(token: NonNullable<typeof analysis.value>['tokens'][0], surface: string): MenuItem[] {
    const normalizedSurface = normalizeKey(surface);
    const currentMatchEntry = findInIndex(wordIndex.value.current, normalizedSurface);
    const previousMatchEntry = findInIndex(wordIndex.value.previous, normalizedSurface);

    const ctx = {
      surface,
      token,
      normalizedSurface,
      currentMatch       : currentMatchEntry ? currentMatchEntry.word : null,
      previousMatchTitle : previousMatchEntry?.dictTitle || null,
      lemmaOptions       : expandLemmasByPos(token)
    };

    const items: MenuItem[] = [];
    for (const strat of MENU_STRATEGIES) {
      const produced = strat(ctx);
      if (produced && produced.length) {
        items.push(...produced);
        // Stratégies remove / inherited sont exclusives -> stop
        if (strat === MENU_STRATEGIES[0] || strat === MENU_STRATEGIES[1]) {
          break;
        }
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
