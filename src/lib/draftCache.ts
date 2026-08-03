import type { ImportedDraft } from './recipes';

/**
 * The per-device half of the previewed-recipe cache.
 *
 * Opening a catalog recipe reads it from the publisher through the importer,
 * which allows ten reads a minute per person. Holding that read only for the
 * life of one screen spends the allowance again every time someone leaves the
 * catalog and comes back, and gives the week's picks and the catalog page
 * separate copies of the same recipe.
 *
 * This is a reading cache, exactly like the browser's own: it lives in
 * `localStorage` on one device, it is never written to Firestore, and it is
 * never committed. Nothing here is a source of truth — every entry can be
 * thrown away at any moment and the only cost is one more read.
 */
export type DraftPersistence = {
  get: (url: string) => ImportedDraft | undefined;
  set: (url: string, draft: ImportedDraft) => void;
};

const KEY = 'forkast.catalog-drafts.v1';

/** Long enough that a week of browsing is one read; short enough that a recipe
 *  the publisher has since corrected is not frozen here forever. */
export const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** The catalog holds forty-five recipes, so this keeps a whole pass through it
 *  plus room for hand-pasted URLs, and still cannot grow without bound. */
export const DRAFT_MAX_ENTRIES = 60;

type Stored = { url: string; readAt: number; draft: ImportedDraft };

/**
 * Wraps a `Storage` as draft persistence. Returns `null` when there is no
 * usable storage — Safari in private mode throws on access rather than
 * reporting absence — so the caller falls back to memory alone.
 *
 * Every operation swallows its own failures. A cache that throws is worse than
 * no cache: the recipe is one fetch away either way, and a preview must never
 * fail because eviction did.
 */
export function createDraftPersistence(
  storage: Storage | null | undefined = safeLocalStorage(),
  now: () => number = () => Date.now(),
): DraftPersistence | null {
  if (!storage) return null;
  return {
    get(url) {
      const fresh = load(storage, now);
      return fresh.find((entry) => entry.url === url)?.draft;
    },
    set(url, draft) {
      const rest = load(storage, now).filter((entry) => entry.url !== url);
      // Newest first, so trimming to the cap drops the least recently read.
      save(storage, [{ url, readAt: now(), draft }, ...rest]);
    },
  };
}

function load(storage: Storage, now: () => number): Stored[] {
  let parsed: unknown;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    parsed = JSON.parse(raw);
  } catch {
    // Unreachable storage, someone else's data, or a half-written value.
    // None of it is ours to interpret.
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const oldest = now() - DRAFT_TTL_MS;
  return parsed.filter(
    (entry): entry is Stored =>
      isRecord(entry) &&
      typeof entry.url === 'string' &&
      typeof entry.readAt === 'number' &&
      entry.readAt > oldest &&
      isDraft(entry.draft),
  );
}

function save(storage: Storage, entries: Stored[]) {
  let keep = entries.slice(0, DRAFT_MAX_ENTRIES);
  while (keep.length) {
    try {
      storage.setItem(KEY, JSON.stringify(keep));
      return;
    } catch {
      // Out of quota, and the newest entry is the one worth keeping. Halve and
      // retry rather than give up: some of this cache still beats none of it.
      keep = keep.slice(0, Math.floor(keep.length / 2));
    }
  }
  try {
    storage.removeItem(KEY);
  } catch {
    // Nothing further to try. Previews still work; they just read again.
  }
}

/**
 * A stored draft is data this device wrote, but a previous version of Forkast
 * may have written it and anything at all may have taken the key since. Check
 * the shape rather than trusting it, or a malformed entry reaches the recipe
 * form as undefined fields.
 */
function isDraft(value: unknown): value is ImportedDraft {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.sourceUrl === 'string' &&
    typeof value.imageUrl === 'string' &&
    (value.baseServings === null || typeof value.baseServings === 'number') &&
    isStringArray(value.ingredientLines) &&
    isStringArray(value.instructions) &&
    typeof value.notes === 'string' &&
    isStringArray(value.tags)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function safeLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}
