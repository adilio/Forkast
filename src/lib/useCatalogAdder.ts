import { useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogEntry } from '../data/catalog';
import { callFunction } from './api';
import {
  addCatalogEntries,
  createDraftCache,
  createImportPacer,
  type AddResult,
} from './catalogImport';
import { getRecipeDuplicateKeys, saveRecipe } from './data';
import { createDraftPersistence } from './draftCache';
import { recipeDuplicateKey, type ImportedDraft } from './recipes';

/**
 * Shared state for adding catalog recipes, used by both the week's picks and
 * the full catalog. Holds the household's duplicate keys so a recipe already in
 * the book reads as saved before anyone taps it.
 */
export function useCatalogAdder(householdId: string | null | undefined) {
  const [savedKeys, setSavedKeys] = useState<Set<string> | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(() => new Set());
  const [progress, setProgress] = useState('');
  const [failures, setFailures] = useState<AddResult[]>([]);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const busy = useRef(false);
  const drafts = useRef(
    createDraftCache(
      async (url) =>
        (await callFunction<{ recipe: ImportedDraft }>('import-recipe', { url }))
          .recipe,
      createDraftPersistence(),
    ),
  ).current;

  useEffect(() => {
    if (!householdId) return;
    let live = true;
    void getRecipeDuplicateKeys(householdId)
      .then((keys) => live && setSavedKeys(keys))
      .catch(() => live && setSavedKeys(new Set()));
    return () => {
      live = false;
    };
  }, [householdId]);

  const isSaved = useCallback(
    (entry: CatalogEntry) =>
      Boolean(
        savedKeys?.has(
          recipeDuplicateKey({ sourceUrl: entry.url, title: entry.title }),
        ),
      ),
    [savedKeys],
  );

  const add = useCallback(
    async (entries: CatalogEntry[]) => {
      if (!householdId || busy.current || !entries.length) return;
      busy.current = true;
      setFailures([]);
      setAddingIds(new Set(entries.map((entry) => entry.id)));
      const pace = createImportPacer({
        onWait: (seconds) =>
          setProgress(
            `Waiting ${seconds} seconds — Forkast limits how fast recipes can be read.`,
          ),
      });
      const results = await addCatalogEntries(entries, {
        existingKeys: savedKeys ?? new Set(),
        importDraft: drafts.get,
        saveRecipe: async (recipe) => void (await saveRecipe(householdId, recipe)),
        beforeImport: async (index) => {
          if (entries.length > 1)
            setProgress(`Adding ${index + 1} of ${entries.length}…`);
          // A recipe read for a preview is already in hand; only a real fetch
          // spends the importer's allowance.
          if (!drafts.peek(entries[index].url)) await pace(index);
          setProgress(
            entries.length > 1
              ? `Adding ${index + 1} of ${entries.length}: ${entries[index].title}`
              : `Reading ${entries[index].title}…`,
          );
        },
        // Each row settles as it lands rather than at the end of the batch: a
        // recipe already in the book must not read as still addable while the
        // rest of a long run finishes.
        onResult: (result) => {
          setAddingIds((current) => {
            const next = new Set(current);
            next.delete(result.entry.id);
            return next;
          });
          if (result.outcome === 'failed') return;
          setSavedKeys(
            (current) =>
              new Set([
                ...(current ?? []),
                recipeDuplicateKey({
                  sourceUrl: result.entry.url,
                  title: result.entry.title,
                }),
              ]),
          );
        },
      });
      const added = results.filter((result) => result.outcome === 'added');
      const skipped = results.filter((result) => result.outcome === 'already-saved');
      const failed = results.filter((result) => result.outcome === 'failed');
      setFailures(failed);
      setProgress(summarize(added.length, skipped.length, failed.length));
      setAddingIds(new Set());
      busy.current = false;
    },
    [householdId, savedKeys, drafts],
  );

  /** Reads a recipe without saving it. `import-recipe` writes nothing. */
  const preview = useCallback(
    async (entry: CatalogEntry) => {
      setPreviewing(entry.id);
      try {
        return { draft: await drafts.get(entry.url) };
      } catch (error) {
        return {
          message:
            error instanceof Error
              ? error.message
              : 'This recipe could not be read right now.',
        };
      } finally {
        setPreviewing(null);
      }
    },
    [drafts],
  );

  return {
    add,
    preview,
    previewing,
    isSaved,
    addingIds,
    progress,
    failures,
    ready: savedKeys !== null,
  };
}

function summarize(added: number, skipped: number, failed: number) {
  const parts = [
    `${added} ${added === 1 ? 'recipe' : 'recipes'} added`,
    ...(skipped ? [`${skipped} already in your book`] : []),
    ...(failed ? [`${failed} could not be read`] : []),
  ];
  return `${parts.join(', ')}.`;
}
