import * as path from 'node:path';
import fs from 'fs-extra';
import readline from 'node:readline';
import type { LefffEntry, PosCode } from '../types';
import { canonicalForm, normalizeKey } from '../lefff/helpers/normalizeKey';

type ParseStats = {
  emptyOrComment: number
  malformed: number
  processed: number
  totalLines: number
};

type ParseResult = {
  formToAnalysesObj: Record<string, LefffEntry[]>
  lemmaPosToFormsObj: Record<string, string[]>
  lemmaToFormsObj: Record<string, string[]>
  stats: ParseStats
};

/** POS codes pour lesquels on utilise la forme de surface comme lemme */
const GENERIC_POS_CODES = ['cln', 'cla', 'cld', 'clr', 'clg', 'cll', 'ilimp'];

/** Détermine le lemme effectif (forme pour pronoms clitiques, lemme sinon) */
function getEffectiveLemma(formCanon: string, pos: string, lemmaCanon: string): string {
  if (GENERIC_POS_CODES.includes(pos)) {
    // Pour les pronoms clitiques, utiliser la forme de surface pour différencier je/il/nous/etc.
    return formCanon;
  }
  return lemmaCanon;
}

/** Returns a trimmed string or null if input is falsy/empty after trim. */
function asTrimmedOrNull(s: unknown): string | null {
  if (typeof s !== 'string') {
    return null;
  }
  const t = s.trim();
  return t.length > 0 ? t : null;
}

async function parseMlex(inputFile: string): Promise<ParseResult> {

  // Map 1: normalized form → analyses[]
  const formToAnalyses = new Map<string, LefffEntry[]>();

  // Map 2: normalized lemma → Set of canonical forms
  const lemmaToFormsCanon = new Map<string, Set<string>>();

  // Map 3: normalized lemma+POS → Set of canonical forms
  const lemmaPosToFormsCanon = new Map<string, Set<string>>();

  const stream = fs.createReadStream(inputFile, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const stats: ParseStats = {
    totalLines     : 0,
    emptyOrComment : 0,
    malformed      : 0,
    processed      : 0
  };

  for await (const line of rl) {
    stats.totalLines += 1;

    const raw = line.trim();
    if (raw.length === 0 || raw.startsWith('#')) {
      stats.emptyOrComment += 1;
      continue;
    }

    // LEFFF .mlex format: form \t POS \t lemma \t (optional traits)
    const parts = raw.split('\t');
    if (parts.length < 3) {
      stats.malformed += 1;
      continue;
    }

    const rawForm = asTrimmedOrNull(parts[0]);
    const rawPos = asTrimmedOrNull(parts[1]);
    const rawLemma = asTrimmedOrNull(parts[2]);
    // traits can be empty → keep undefined if missing/empty
    const rawTraits = asTrimmedOrNull(parts[3] ?? '');

    // Mandatory fields: form, POS, lemma
    if (!rawForm || !rawPos || !rawLemma) {
      stats.malformed += 1;
      continue;
    }

    // Canonical values for display (accents kept, punctuation/spaces unified)
    const formCanon = canonicalForm(rawForm);
    const lemmaCanon = canonicalForm(rawLemma);

    // Lemme effectif: forme de surface pour pronoms clitiques, lemme LEFFF sinon
    const effectiveLemma = getEffectiveLemma(formCanon, rawPos, lemmaCanon);

    // Lookup keys (lowercased, accent-less, unified punctuation/spaces)
    const keyForm = normalizeKey(rawForm);
    const keyLemmaEffective = normalizeKey(effectiveLemma);
    const keyLemmaPosEffective = normalizeKey(`${effectiveLemma} ${rawPos}`);

    // 1) form → analyses (handle homographs, e.g., "souris")
    const entry: LefffEntry = { form: formCanon, lemma: effectiveLemma, pos: rawPos as PosCode, traits: rawTraits ?? undefined };
    const existing = formToAnalyses.get(keyForm);
    if (existing) {
      existing.push(entry);
    } else {
      formToAnalyses.set(keyForm, [entry]);
    }

    // 2) lemma → forms (use Set to deduplicate)
    let set = lemmaToFormsCanon.get(keyLemmaEffective);
    if (!set) {
      set = new Set<string>();
      lemmaToFormsCanon.set(keyLemmaEffective, set);
    }
    set.add(formCanon);

    // 3) lemma+POS → forms (use Set to deduplicate)
    let setPos = lemmaPosToFormsCanon.get(keyLemmaPosEffective);
    if (!setPos) {
      setPos = new Set<string>();
      lemmaPosToFormsCanon.set(keyLemmaPosEffective, setPos);
    }
    setPos.add(formCanon);

    stats.processed += 1;
  }

  // Serialize to plain objects for JSON output
  const formToAnalysesObj: Record<string, LefffEntry[]> = Object.create(null);
  for (const [k, v] of formToAnalyses) {
    formToAnalysesObj[k] = v;
  }

  const lemmaToFormsObj: Record<string, string[]> = Object.create(null);
  const collator = new Intl.Collator('fr', {
    sensitivity       : 'base', // ignore accents/case for alphabetical order
    ignorePunctuation : true
  });
  for (const [k, set] of lemmaToFormsCanon) {
    const arr = Array.from(set);
    arr.sort((a, b) => collator.compare(a, b));
    lemmaToFormsObj[k] = arr;
  }

  const lemmaPosToFormsObj: Record<string, string[]> = Object.create(null);
  for (const [k, set] of lemmaPosToFormsCanon) {
    const arr = Array.from(set);
    arr.sort((a, b) => collator.compare(a, b));
    lemmaPosToFormsObj[k] = arr;
  }

  return { formToAnalysesObj, lemmaToFormsObj, lemmaPosToFormsObj, stats };
}

async function main(): Promise<void> {
  const inFile = path.join(process.cwd(), 'data', 'lefff', 'lefff-3.4.mlex');
  const outDir = path.join(process.cwd(), 'src-tauri', 'assets');

  const exists = await fs.pathExists(inFile);
  if (!exists) {
    throw new Error(`Input file not found: ${inFile}
- Copy the LEFFF .mlex file into data/lefff/
- Expected format: "form\\tPOS\\tlemma\\ttraits"`);
  }

  await fs.ensureDir(outDir);

  console.time('LEFFF import');
  const { formToAnalysesObj, lemmaToFormsObj, lemmaPosToFormsObj, stats } = await parseMlex(inFile);
  console.timeEnd('LEFFF import');

  const lemmasCount = Object.keys(lemmaToFormsObj).length;
  const formsCount = Object.keys(formToAnalysesObj).length;

  console.log(`Total lines: ${stats.totalLines}`);
  console.log(`Skipped (empty/comment): ${stats.emptyOrComment}`);
  console.log(`Skipped (malformed): ${stats.malformed}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Form keys (normalized): ${formsCount}`);
  console.log(`Lemma keys (normalized): ${lemmasCount}`);

  const f1 = path.join(outDir, 'formToAnalyses.json');
  const f2 = path.join(outDir, 'lemmaToForms.json');
  const f3 = path.join(outDir, 'lemmaPosToForms.json');

  await fs.writeJSON(f1, formToAnalysesObj, { spaces: 0 });
  await fs.writeJSON(f2, lemmaToFormsObj, { spaces: 0 });
  await fs.writeJSON(f3, lemmaPosToFormsObj, { spaces: 0 });

  console.log('✅ Exported:');
  console.log('  -', f1);
  console.log('  -', f2);
  console.log('  -', f3);
}

try {
  await main();
} catch (err) {
  console.error('Error in LEFFF import:', err);
  process.exit(1);
}
