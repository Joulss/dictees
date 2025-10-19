import { readUserDb, writeUserDb } from './ipc';
import { normalizeKey } from '../lefff/helpers/normalizeKey.ts';
import type { BaseWord, Dictation, ExceptionalWord, ExoticWord, LemmaWord, NewDictation, SelectedWord, UserDb } from '../types.ts';

/**
 * Read user DB from storage, parse and validate it.
 * Throws on any error.
 */
export async function readDb(): Promise<UserDb> {
  const raw = await readUserDb();
  const s = (raw ?? '').trim();

  if (s === '') {
    // Avec l'init Tauri, ce cas ne devrait pas arriver.
    throw new Error('USER_DB_MISSING_OR_EMPTY');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(s);
  } catch (e) {
    const err = new Error('USER_DB_PARSE_ERROR');
    (err as any).cause = e;
    throw err;
  }

  // Vérification de forme minimale (strict enough)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('USER_DB_SHAPE_ERROR');
  }
  if (!Array.isArray(parsed.dictees) || !Array.isArray(parsed.baseWords)) {
    throw new TypeError('USER_DB_SHAPE_ERROR');
  }

  return parsed as UserDb;
}

/**
 * Write user DB to storage safely.
 * @param db
 */
export async function writeDbSafe(db: UserDb): Promise<void> {
  await writeUserDb(JSON.stringify(db));
}

/**
 * # Helpers
 */

export async function getDictations(): Promise<Dictation[]> {
  const db = await readDb();
  return db.dictees
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function saveDictations(next: Dictation[]): Promise<void> {
  const db = await readDb();
  await writeDbSafe({ ...db, dictees: next });
}

export async function getBaseWords(): Promise<BaseWord[]> {
  const db = await readDb();
  return db.baseWords;
}

// Helper functions pour les types de mots
function isLemmaWord(word: SelectedWord): word is LemmaWord {
  return 'lemma' in word;
}

function isExoticWord(word: SelectedWord): word is ExoticWord {
  return 'surface' in word && !('exceptionType' in word);
}

function isExceptionalWord(word: SelectedWord): word is ExceptionalWord {
  return 'exceptionType' in word;
}

export async function addBaseWord(word: BaseWord['word']): Promise<void> {
  const db = await readDb();
  const bw: BaseWord = {
    word,
    integrated: false
  };
  db.baseWords.push(bw);
  await writeDbSafe(db);
}

export async function removeBaseWord(word: BaseWord['word']): Promise<void> {
  const db = await readDb();
  db.baseWords = db.baseWords.filter(w =>
    !(w.word.lemma === word.lemma && w.word.pos === word.pos)
  );
  await writeDbSafe(db);
}

/**
 * Recalcule `integrated`/`firstDictationId` à partir des dictées.
 */
export async function recomputeBaseIntegration(formsByLemmaAndPos: (lemma: string, pos: string) => string[]): Promise<void> {
  const db = await readDb();

  type Info = { firstDictationId: string };
  const present = new Map<string, Info>(); // key lemma:pos -> info

  const asc = db.dictees
    .slice()
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

  for (const d of asc) {
    const keys = expandSelectedWordsToKeys(d.selectedWords, formsByLemmaAndPos);
    for (const key of keys) {
      if (!present.has(key)) {
        present.set(key, { firstDictationId: d.createdAt });
      }
    }
  }

  db.baseWords = db.baseWords.map(w => {
    const key = `${w.word.lemma}:${w.word.pos}`;
    const info = present.get(key);
    return info
      ? { ...w, integrated: true, firstDictationId: info.firstDictationId }
      : { ...w, integrated: false, firstDictationId: undefined };
  });

  await writeDbSafe(db);
}

/* Utilitaires */

export function expandSelectedWordsToKeys(
  selected: SelectedWord[],
  _formsByLemmaAndPos: (lemma: string, pos: string) => string[]
): Set<string> {
  const out = new Set<string>();
  for (const item of selected) {
    if (isLemmaWord(item)) {
      // Ajouter la clé lemma:pos
      out.add(`${item.lemma}:${item.pos}`);
    } else if (isExoticWord(item) || isExceptionalWord(item)) {
      // Pour les mots exotiques/exceptionnels, on utilise la surface normalisée
      out.add(`exotic:${normalizeKey(item.surface)}`);
    }
  }
  return out;
}

/* Petites factories (pour créer des objets toujours “propres”) */

export function createDictation(props: NewDictation): Dictation {
  const now = new Date();
  return {
    title         : props.title || now.toLocaleDateString('fr-FR'),
    date          : now.toLocaleDateString('fr-FR'),
    createdAt     : now.toISOString(),
    text          : props.text,
    selectedWords : [],
    color         : props.color
  };
}

export function createBaseWord(word: BaseWord['word']): BaseWord {
  return {
    word,
    integrated: false
  };
}
