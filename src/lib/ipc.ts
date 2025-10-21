import { invoke } from '@tauri-apps/api/core';

export async function readAsset(path: string): Promise<string> {
  return invoke<string>('read_asset', { path });
}

export async function readUserDb(): Promise<string> {
  return invoke<string>('read_user_db');
}

export async function writeUserDb(json: string): Promise<void> {
  return invoke<void>('write_user_db', { json });
}
