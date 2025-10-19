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

export function colorWithOpacity(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) {
    return hex;
  }
  const raw = m[1];
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
