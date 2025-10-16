import { APOST_CLASS } from './apostropheClass';

/**
 * Minimal token shape for the tokenizer.
 * Downstream services will enrich these into full AnalyzedToken objects.
 */
export type RawToken = {
  end: number;
  isWord: boolean;
  start: number;
  text: string;
};

/**
 * Try to match a left-elision at the given UTF-16 index:
 *   Left + apostrophe + Right  (letters only)
 * Returns byte offsets suitable for JS string slicing.
 */
export function matchElisionAt(
  text: string,
  index: number
): null | {
  apos: string;
  left: string;
  leftEnd: number; // includes apostrophe
  leftStart: number;
  right: string;
  rightEnd: number;
  rightStart: number;
} {
  const sub = text.slice(index);
  const re = new RegExp(String.raw`^(\p{L}+)\s*(${APOST_CLASS})(\p{L}+)`, 'u');
  const m = re.exec(sub);

  // Guard all three capture groups so they narrow to string (not string | undefined)
  if (m?.[1] === undefined || m[2] === undefined || m[3] === undefined) {
    return null;
  }

  const left = m[1];
  const apos = m[2];
  const right = m[3];

  const leftBytes = left.length;
  const aposBytes = apos.length;
  const rightBytes = right.length;

  return {
    apos,
    left,
    right,
    leftStart  : index,
    leftEnd    : index + leftBytes + aposBytes,
    rightStart : index + leftBytes + aposBytes,
    rightEnd   : index + leftBytes + aposBytes + rightBytes
  };
}


/**
 * Build a Unicode-aware sticky word regex that excludes internal apostrophes.
 */
function buildTokenizerNoApostrophe() {
  const WORD_NO_APOS = String.raw`\p{L}(?:[\p{L}\p{M}\p{Nd}])*`;
  const wordRe = new RegExp(WORD_NO_APOS, 'yu');
  return { wordRe };
}

/**
 * Tokenize the input string while splitting left-elisions:
 * "qu’il" → ["qu’"(word), "il"(word)]
 * Non-words (punctuation, spaces, symbols) are returned as tokens with isWord:false.
 */
export function tokenize(text: string): { tokens: RawToken[] } {
  const { wordRe } = buildTokenizerNoApostrophe();
  const tokens: RawToken[] = [];

  let i = 0;
  while (i < text.length) {
    // 1) Try left-elision at current index
    const el = matchElisionAt(text, i);
    if (el) {
      const leftToken: RawToken = {
        text   : text.slice(el.leftStart, el.leftEnd),
        start  : el.leftStart,
        end    : el.leftEnd,
        isWord : true
      };
      const rightToken: RawToken = {
        text   : text.slice(el.rightStart, el.rightEnd),
        start  : el.rightStart,
        end    : el.rightEnd,
        isWord : true
      };
      tokens.push(leftToken, rightToken);
      i = el.rightEnd;
      continue;
    }

    // 2) Plain word without internal apostrophes
    wordRe.lastIndex = i;
    const m = wordRe.exec(text);
    if (m) {
      const value = m[0];
      const start = i;
      const end = start + value.length;
      tokens.push({
        text   : value,
        start,
        end,
        isWord : true
      });
      i = end;
      continue;
    }

    // 3) Non-word: consume a single code point (handles surrogate pairs)
    const cp = text.codePointAt(i)!;
    const charLen = cp > 0xffff ? 2 : 1;
    const start = i;
    const end = i + charLen;
    tokens.push({
      text   : text.slice(start, end),
      start,
      end,
      isWord : false
    });
    i = end;
  }

  return { tokens };
}
