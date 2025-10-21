import { readUserDb, writeUserDb } from './ipc';
import type { Feed, FeedObject, UserDb } from '../types.ts';
import { invoke } from '@tauri-apps/api/core';

/** Read / wrtite user DB */

export async function getFeed(): Promise<Feed> {
  try {
    const raw = await invoke<string>('read_user_db');
    const db: UserDb = JSON.parse(raw);
    return db.feed.toSorted((a: FeedObject, b: FeedObject) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch (error) {
    throw new Error('Failed to read user DB', { cause: error });
  }
}

export async function writeFeed(feed: Feed): Promise<void> {
  try {
    await writeUserDb(JSON.stringify({ feed }));
  } catch (error) {
    throw new Error('Failed to write user DB', { cause: error });
  }
}

/** Helpers */

export async function saveDictation(dictation: Dictation): Promise<void> {
  try {
    const db = JSON.parse(await readUserDb());
    db.dictations.splice(db.dictations.findIndex((d: Dictation) => d.createdAt === dictation.createdAt), 1, dictation);
    await writeFeed(db);
  } catch (error) {
    throw new Error('Failed to save dictations', { cause: error });
  }
}

export async function saveList(list: List): Promise<void> {
  try {
    const db = JSON.parse(await readUserDb()) as UserDb;
    db.lists.splice(db.lists.findIndex((l: List) => l.createdAt === list.createdAt), 1, list);
    await writeFeed(db);
  } catch (error) {
    throw new Error('Failed to save lists', { cause: error });
  }


}
