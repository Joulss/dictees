import { readUserDb, writeUserDb } from './ipc';
import { normalizeKey } from '../lefff/helpers/normalizeKey.ts';
import type { BaseWord, Dictation, NewDictation, SelectedWord, UserDb } from '../types.ts';

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

export async function addBaseWord(surface: string): Promise<void> {
  const s = surface.trim();
  if (!s) {
    return;
  }
  const db = await readDb();
  const normalized = normalizeKey(s);
  if (db.baseWords.some(w => w.normalized === normalized)) {
    return;
  }
  const bw: BaseWord = createBaseWord(s);
  db.baseWords.push(bw);
  await writeDbSafe(db);
}

export async function removeBaseWord(normalized: string): Promise<void> {
  const db = await readDb();
  db.baseWords = db.baseWords.filter(w => w.normalized !== normalized);
  await writeDbSafe(db);
}

export async function renameBaseWord(normalized: string, newSurface: string): Promise<void> {
  const s = newSurface.trim();
  if (!s) {
    return;
  }
  const db = await readDb();
  const i = db.baseWords.findIndex(w => w.normalized === normalized);
  if (i < 0) {
    return;
  }
  db.baseWords[i] = { ...db.baseWords[i], surface: s };
  await writeDbSafe(db);
}

/**
 * Recalcule `integrated`/`firstDictationId` à partir des dictées.
 */
export async function recomputeBaseIntegration(formsByLemma: (lemma: string) => string[]): Promise<void> {
  const db = await readDb();

  type Info = { firstDictationId: string };
  const present = new Map<string, Info>(); // surface normalisée -> info

  const asc = db.dictees
    .slice()
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

  for (const d of asc) {
    const surfaces = expandSelectedWordsToSurfaces(d.selectedWords, formsByLemma);
    for (const s of surfaces) {
      if (!present.has(s)) {
        present.set(s, { firstDictationId: d.createdAt });
      }
    }
  }

  db.baseWords = db.baseWords.map(w => {
    const info = present.get(w.normalized);
    return info
      ? { ...w, integrated: true, firstDictationId: info.firstDictationId }
      : { ...w, integrated: false, firstDictationId: undefined };
  });

  await writeDbSafe(db);
}

/* Utilitaires */

export function expandSelectedWordsToSurfaces(selected: SelectedWord[], formsByLemma: (lemma: string) => string[]): Set<string> {
  const out = new Set<string>();
  for (const item of selected) {
    if (item.type === 'lemma') {
      const forms = formsByLemma(item.lemma) || [];
      for (const f of forms) {
        out.add(normalizeKey(f));
      }
    } else {
      out.add(item.surfaceNormalized);
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

export function createBaseWord(surface: string): BaseWord {
  return {
    surface,
    normalized : normalizeKey(surface),
    createdAt  : new Date().toISOString(),
    integrated : false
  };
}
