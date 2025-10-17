// Palette sobre (modifiable plus tard)
export const DICTATION_PALETTE = [
  '#4CAF50', // green
  '#E91E63', // pink
  '#2196F3', // blue
  '#FF9800', // orange
  '#9C27B0' // purple
] as const;

export function nextDictationColor(existing: string[]): string {
  if (!existing.length) {
    return DICTATION_PALETTE[0];
  }
  // cherche la 1re couleur de la palette non utilisée, sinon boucle
  for (const c of DICTATION_PALETTE) {
    if (!existing.includes(c)) {
      return c;
    }
  }
  const last = existing.length;
  return DICTATION_PALETTE[last % DICTATION_PALETTE.length];
}
