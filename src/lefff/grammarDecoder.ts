import type { Gender, Grammar, GrammaticalNumber, Mood, Participle, PosCode, PronounRole, SimpleTense, WordType } from '../types';

/**
 * Is this a verb-related POS code?
 */
function isVerbPos(pos: PosCode): boolean {
  return pos === 'v' || pos === 'auxEtre' || pos === 'auxAvoir';
}

/**
 * Map a LEFFF POS code to a base WordType and optional static flags.
 * This is morphology-agnostic (no traits involved).
 */
function mapPosToType(pos: PosCode): {
  auxiliary?: 'avoir' | 'être'
  clitic?: boolean
  role?: PronounRole
  type: WordType
} {
  switch (pos) {
  case 'v': return { type: 'verbe' };
  case 'nc': return { type: 'nom commun' };
  case 'adj': return { type: 'adjectif' };
  case 'det': return { type: 'déterminant' };
  case 'adv': return { type: 'adverbe' };
  case 'prep': return { type: 'préposition' };

  case 'auxEtre': return { type: 'verbe', auxiliary: 'être' };
  case 'auxAvoir': return { type: 'verbe', auxiliary: 'avoir' };

  case 'coo':
  case 'csu':
  case 'prel':
  case 'pri':
  case 'que':
  case 'que_restr':
    return { type: 'conjonction' };

  case 'np': return { type: 'nom propre' };
  case 'pro': return { type: 'pronom' };

  case 'cla': return { type: 'pronom', clitic: true, role: 'objet direct' };
  case 'cld': return { type: 'pronom', clitic: true, role: 'objet indirect' };
  case 'clr': return { type: 'pronom', clitic: true, role: 'réfléchi' };
  case 'clg':
  case 'cll':
    return { type: 'pronom', clitic: true, role: 'adverbial' };
  case 'cln': return { type: 'pronom', clitic: true, role: 'sujet' };
  case 'ilimp': return { type: 'pronom', role: 'impersonnel' };

  default: return { type: 'autre' };
  }
}

/**
 * Decode gender from a compact LEFFF trait string.
 * Looks for lowercase 'm' (masculine) and 'f' (feminine).
 */
function decodeGender(traits?: string | null): Gender | undefined {
  if (!traits) {
    return undefined;
  }
  if (traits.includes('m')) {
    return 'masculin';
  }
  if (traits.includes('f')) {
    return 'féminin';
  }
  return undefined;
}

/**
 * Decode grammatical number from a compact LEFFF trait string.
 * Looks for lowercase 's' (singular) and 'p' (plural).
 */
function decodeNumber(traits?: string | null): GrammaticalNumber | undefined {
  if (!traits) {
    return undefined;
  }
  if (traits.includes('s')) {
    return 'singulier';
  }
  if (traits.includes('p')) {
    return 'pluriel';
  }
  return undefined;
}

/**
 * Decode person marks from a compact LEFFF trait string.
 * Pattern: one to three digits 1..3, optionally followed by s/p (ignored here).
 * Example: "12s" → [1, 2], "3p" → [3]
 */
function decodePersons(traits?: string | null): number[] | undefined {
  if (!traits) {
    return undefined;
  }

  const m = /([123]{1,3})([sp])?/i.exec(traits);
  const digits = m?.[1];
  if (!digits) {
    return undefined;
  }

  const list = digits
    .split('')
    .map(d => Number.parseInt(d, 10))
    .filter(n => n >= 1 && n <= 3);

  return list.length > 0 ? list : undefined;
}

/**
 * Decode simple tense (present/imperfect) from traits, given a decoded mood.
 * Only returns values for finite moods (indicative, subjunctive).
 */
function decodeTense(traits?: string | null, mood?: Mood): SimpleTense | undefined {
  if (!traits || !mood) {
    return undefined;
  }
  const t = traits.toUpperCase();

  // non-finies
  if (mood === 'infinitif' || mood === 'gérondif' || mood === 'participe') {
    return undefined;
  }

  if (mood === 'indicatif') {
    if (t.startsWith('P') && !t.includes('S')) {
      return 'présent';
    } // P..., mais pas PS
    if (t.includes('I')) {
      return 'imparfait';
    }
    if (t.includes('F')) {
      return 'futur';
    }
    // certains dumps codent le passé simple par 'S' sans 'P' ni 'PS'
    if (t.includes('S') && !t.includes('PS')) {
      return 'passé simple';
    }
    return undefined;
  }

  if (mood === 'subjonctif') {
    // PS ou S → subjonctif présent (on ne traite pas ici l’imparfait du subjonctif)
    if (t.includes('PS') || t.includes('S')) {
      return 'présent';
    }
    return undefined;
  }

  if (mood === 'conditionnel') {
    // Par défaut, on considère "présent" (les dumps conditionnels simples sont typiquement 'C' ou 'CJ')
    return 'présent';
  }

  // impératif : pas de temps
  return undefined;
}

/**
 * Decode participle kind from traits.
 * Structurally we only expose 'passé' here; "participe présent" is considered a presentation label.
 */
function decodeParticiple(traits?: string | null): Participle | undefined {
  if (!traits) {
    return undefined;
  }
  const t = traits.toUpperCase();

  // "KP" → participe présent (ex. parlant, finissant…)
  if (t.includes('K') && t.includes('P')) {
    return 'présent';
  }

  // "K" sans "P" → participe passé (accords éventuels en minuscules: m/f/s/p)
  if (t.includes('K')) {
    return 'passé';
  }

  return undefined;
}


/**
 * Decode mood from compact LEFFF trait string (structural dialect).
 * Legend (this project dialect):
 *  - W = infinitif
 *  - G = gérondif
 *  - Y = impératif
 *  - K = participe
 *  - F = futur (indicatif)
 *  - PS = subjonctif présent
 *  - S = subjonctif (ou imparfait du subjonctif, mais on ne gère pas ça ici)
 *  - C = conditionnel
 *  - I = imparfait (indicatif)
 *  - P = présent (indicatif, si pas suivi de S)
 *  - J = présent (indicatif, selon certains dumps)
 *
 * Note: some moods are non-finite (infinitif, gérondif, participe) and do not have tense or person.
 */
function decodeMood(traits?: string | null): Mood | undefined {
  if (!traits) {
    return undefined;
  }
  const caps = traits.match(/[A-Z]+/g)?.join('') ?? '';

  // non finies
  if (caps.includes('W')) {
    return 'infinitif';
  }
  if (caps.includes('G')) {
    return 'gérondif';
  }
  if (caps.includes('Y')) {
    return 'impératif';
  }
  if (caps.includes('K')) {
    return 'participe';
  }

  // ✅ futur → mood indicatif (sinon decodeTense ne s'applique pas)
  if (caps.includes('F')) {
    return 'indicatif';
  }

  // subjonctif
  if (caps.includes('PS') || caps.includes('S')) {
    return 'subjonctif';
  }

  // conditionnel
  if (caps.includes('C')) {
    return 'conditionnel';
  }

  // indicatif (imparfait 'I', présent 'P' tête sans 'PS', ou 'J' selon dump)
  if (caps.includes('I')) {
    return 'indicatif';
  }
  if (/^P(?!S)/.test(caps)) {
    return 'indicatif';
  }
  if (caps.includes('J')) {
    return 'indicatif';
  }

  return undefined;
}




/**
 * Decode a LEFFF POS code and optional traits into a full Grammar object.
 */
export function decodeGrammar(pos: PosCode, traits?: string | null): Grammar {
  const base = mapPosToType(pos);
  const gender = decodeGender(traits);
  const number = decodeNumber(traits);

  if (!isVerbPos(pos)) {
    return {
      auxiliary : base.auxiliary,
      clitic    : base.clitic,
      gender,
      number,
      persons   : undefined,
      role      : base.role,
      tense     : undefined,
      type      : base.type
    };
  }

  const mood = decodeMood(traits);
  const tense = decodeTense(traits, mood);
  const participle = mood === 'participe' ? decodeParticiple(traits) : undefined;
  const persons = decodePersons(traits);

  return {
    auxiliary : base.auxiliary,
    clitic    : base.clitic,
    gender,
    mood,
    number,
    participle,
    persons,
    role      : base.role,
    tense,
    type      : base.type
  };
}
