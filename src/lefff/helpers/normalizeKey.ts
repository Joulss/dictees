/**
 * Produce a stable, accent-less, lowercase key for dictionary lookups.
 * Aggressively: strip diacritics, fold apostrophes/dashes/spaces.
 */

const RE_SMART_APOSTROPHES = /[\u2019\u2018\u02BC\uFF07]/g; // ’ ‘ ʼ fullwidth
const RE_UNICODE_DASHES = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g; // hyphen/dash variants → '-'
const RE_UNICODE_SPACES = /[\u00A0\u202F\u2000-\u200A\u2028\u2029\u3000]/g; // NBSP, NNBSP, etc.
const RE_DIACRITICS = /\p{M}+/gu;
const RE_MULTIPLE_SPACES = / +/g;

function isAllAscii(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if ((cp ?? ch.charCodeAt(0)) > 0x7f) {
      return false;
    }
  }
  return true;
}

export function normalizeKey(raw: string): string {
  if (!raw) {
    return '';
  }
  if (isAllAscii(raw)) {
    return raw.toLowerCase().replaceAll(RE_MULTIPLE_SPACES, ' ').trim();
  }
  return raw
    .normalize('NFKD')
    .replaceAll(RE_SMART_APOSTROPHES, '\'')
    .replaceAll(RE_UNICODE_DASHES, '-')
    .replaceAll(RE_UNICODE_SPACES, ' ')
    .toLowerCase()
    .replaceAll(RE_DIACRITICS, '')
    .replaceAll(RE_MULTIPLE_SPACES, ' ')
    .trim();
}

export function canonicalForm(raw: string): string {
  if (!raw) {
    return '';
  }
  return raw
    .replaceAll(RE_SMART_APOSTROPHES, '\'')
    .replaceAll(RE_UNICODE_DASHES, '-')
    .replaceAll(RE_UNICODE_SPACES, ' ')
    .normalize('NFC')
    .replaceAll(RE_MULTIPLE_SPACES, ' ')
    .trim();
}
