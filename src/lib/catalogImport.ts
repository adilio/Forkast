import type { CatalogEntry } from '../data/catalog';
import { draftToRecipe, recipeDuplicateKey, type ImportedDraft } from './recipes';
import type { Recipe } from './types';

export type AddOutcome = 'added' | 'already-saved' | 'failed';

export type AddResult = {
  entry: CatalogEntry;
  outcome: AddOutcome;
  /** Present only on failure, and shown as-is: one blocked publisher is a fact
   *  about that recipe, not a reason to fail the rest of the batch. */
  message?: string;
};

export type AddCatalogDeps = {
  /** Duplicate keys already in the household, from `getRecipeDuplicateKeys`. */
  existingKeys: Set<string>;
  importDraft: (url: string) => Promise<ImportedDraft>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  /** Awaited before each import so a batch stays inside the importer's limit. */
  beforeImport?: (index: number) => Promise<void>;
  onResult?: (result: AddResult, done: number, total: number) => void;
};

/**
 * Adds catalog entries to the household by importing each one, exactly as the
 * import screen does. The recipe text is fetched at this moment rather than
 * shipped with the app — see the note on the catalog itself.
 *
 * Duplicates are checked twice: once against the entry's own URL, and again
 * against the URL the publisher declares canonical, which is what actually gets
 * saved and is often not the link we hold.
 */
export async function addCatalogEntries(
  entries: CatalogEntry[],
  deps: AddCatalogDeps,
): Promise<AddResult[]> {
  const seen = new Set(deps.existingKeys);
  const results: AddResult[] = [];
  for (const [index, entry] of entries.entries()) {
    const result = await addOne(entry, index, seen, deps);
    results.push(result);
    deps.onResult?.(result, results.length, entries.length);
  }
  return results;
}

async function addOne(
  entry: CatalogEntry,
  index: number,
  seen: Set<string>,
  deps: AddCatalogDeps,
): Promise<AddResult> {
  const linkKey = recipeDuplicateKey({ sourceUrl: entry.url, title: entry.title });
  if (seen.has(linkKey)) return { entry, outcome: 'already-saved' };
  try {
    await deps.beforeImport?.(index);
    const recipe = draftToRecipe(await deps.importDraft(entry.url));
    const savedKey = recipeDuplicateKey(recipe);
    if (seen.has(savedKey)) {
      seen.add(linkKey);
      return { entry, outcome: 'already-saved' };
    }
    await deps.saveRecipe(recipe);
    seen.add(linkKey);
    seen.add(savedKey);
    return { entry, outcome: 'added' };
  } catch (error) {
    return {
      entry,
      outcome: 'failed',
      message:
        error instanceof Error ? error.message : 'This recipe could not be added.',
    };
  }
}

/**
 * The import function allows ten imports per minute per person. A batch runs
 * one under that and then waits out the rest of the window, so adding the whole
 * catalog is slow and complete rather than fast and half-refused.
 */
export const IMPORTS_PER_MINUTE = 9;

export function createImportPacer({
  now = () => Date.now(),
  wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  onWait,
}: {
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
  onWait?: (seconds: number) => void;
} = {}) {
  let windowStart = 0;
  let inWindow = 0;
  return async (index: number) => {
    if (index === 0) {
      windowStart = now();
      inWindow = 0;
    }
    if (inWindow >= IMPORTS_PER_MINUTE) {
      const remaining = 60_000 - (now() - windowStart);
      if (remaining > 0) {
        onWait?.(Math.ceil(remaining / 1000));
        await wait(remaining);
      }
      windowStart = now();
      inWindow = 0;
    }
    inWindow += 1;
  };
}
