/**
 * LEFFF adapter types.
 * These types mirror the LEFFF dump structures and POS codes.
 * They are specific to the LEFFF integration layer.
 */

export type PosCode =
| 'v'
| 'nc'
| 'adj'
| 'adv'
| 'det'
| 'pro'
| 'cla'
| 'cld'
| 'cln'
| 'clr'
| 'clg'
| 'cll'
| 'prep'
| 'coo'
| 'csu'
| 'prel'
| 'pri'
| 'que'
| 'que_restr'
| 'np'
| 'auxEtre'
| 'auxAvoir'
| 'ilimp';

/** One LEFFF analysis entry for a given surface form. */
export type LefffEntry = {
  form: string; // canonical surface form (accented) for display
  lemma: string; // canonical lemma (accented) for display
  pos: PosCode; // LEFFF POS code
  traits?: string;
};

/** Internal: a LEFFF entry plus its normalized lemma key. */
export type ResultEntry = LefffEntry & { lemmaKey: string };

/** JSON map: normalized surface form → list of analyses. */
export type LefffFormToAnalyses = Record<string, LefffEntry[]>;

/** JSON map: normalized lemma → list of canonical surface forms. */
export type LefffLemmaToForms = Record<string, string[]>;
