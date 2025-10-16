// src/api.ts  (FRONT)
// Simple wrappers around Tauri commands. All comments in English.

import { invoke } from '@tauri-apps/api/core';

export interface OkResponse {
  status: number;
  message: string;
}

export function wordsAnalyses(surface: string, verbose?: boolean) {
  return invoke<OkResponse>('words_analyses', { surface, verbose });
}

export function wordsForms(lemma: string) {
  return invoke<OkResponse>('words_forms', { lemma });
}

export function dictationsAnalyze(text: string, verbose?: boolean) {
  return invoke<OkResponse>('dictations_analyze', { text, verbose });
}
