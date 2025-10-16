// All comments in English.
// Thin wrappers around Tauri read_user_db / write_user_db, with a tiny shape guard.

import { readUserDb, writeUserDb } from './ipc';

export interface UserDb {
  dictees: unknown[]; // keep your real types later if you want
  words: { surface: string; addedAt: number }[];
}

const DEFAULT_DB: UserDb = { dictees: [], words: [] };

export async function readDb(): Promise<UserDb> {
  const raw = await readUserDb();
  try {
    const parsed = JSON.parse(raw) as Partial<UserDb> | null;
    if (
    parsed &&
    Array.isArray(parsed.dictees ?? []) &&
    Array.isArray(parsed.words ?? [])
    ) {
      // Normalize shape
      return {
        dictees: parsed.dictees as unknown[],
        words: (parsed.words as any[]).map(w => {
          if (w && typeof w.surface === 'string') {
            return { surface: w.surface, addedAt: Number(w.addedAt ?? Date.now()) };
          }
          return { surface: String(w), addedAt: Date.now() };
        })
      };
    }
  } catch {
    // fallthrough
  }
  return DEFAULT_DB;
}

export async function writeDbSafe(db: UserDb): Promise<void> {
  // Validate minimum shape before write
  const safe: UserDb = {
    dictees: Array.isArray(db.dictees) ? db.dictees : [],
    words: Array.isArray(db.words) ? db.words.map(w => ({
      surface: String(w.surface ?? ''),
      addedAt: Number(w.addedAt ?? Date.now())
    })) : []
  };
  await writeUserDb(JSON.stringify(safe));
}

// --- Convenience helpers for "known words" ---

export async function getKnownWords(): Promise<string[]> {
  const db = await readDb();
  return db.words.map(w => w.surface);
}

export async function addKnownWord(surface: string): Promise<void> {
  const s = surface.trim();
  if (!s) return;
  const db = await readDb();
  // avoid duplicates (case-insensitive simple pass)
  const exists = db.words.some(w => w.surface.toLowerCase() === s.toLowerCase());
  if (!exists) db.words.push({ surface: s, addedAt: Date.now() });
  await writeDbSafe(db);
}
