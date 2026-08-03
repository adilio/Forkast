import { describe, expect, it, vi } from 'vitest';
import type { CatalogEntry } from '../data/catalog';
import {
  IMPORTS_PER_MINUTE,
  addCatalogEntries,
  createDraftCache,
  createImportPacer,
} from './catalogImport';
import { recipeDuplicateKey, type ImportedDraft } from './recipes';
import type { Recipe } from './types';

const entry = (id: string, url: string): CatalogEntry => ({
  id,
  title: id,
  siteName: 'Somewhere',
  url,
  imageUrl: '',
  tags: [],
  minutes: null,
});

const draft = (overrides: Partial<ImportedDraft> = {}): ImportedDraft => ({
  title: 'Chicken and rice',
  description: '',
  sourceUrl: 'https://example.com/chicken-and-rice',
  imageUrl: '',
  baseServings: 4,
  ingredientLines: ['1 cup rice', '2 chicken thighs'],
  instructions: ['Cook it.'],
  notes: '',
  tags: [],
  ...overrides,
});

describe('adding catalog recipes', () => {
  it('imports the recipe text rather than shipping it', async () => {
    const saved: Recipe[] = [];
    const results = await addCatalogEntries(
      [entry('chicken', 'https://example.com/chicken-and-rice')],
      {
        existingKeys: new Set(),
        importDraft: async () => draft(),
        saveRecipe: async (recipe) => void saved.push(recipe),
      },
    );
    expect(results[0].outcome).toBe('added');
    expect(saved[0].ingredients.map((x) => x.name)).toEqual(['rice', 'chicken thighs']);
    expect(saved[0].sourceHost).toBe('example.com');
  });

  it('skips a recipe the household already has, without fetching it', async () => {
    const importDraft = vi.fn(async () => draft());
    const results = await addCatalogEntries(
      [entry('chicken', 'https://example.com/chicken-and-rice')],
      {
        existingKeys: new Set([
          recipeDuplicateKey({
            sourceUrl: 'https://example.com/chicken-and-rice',
            title: 'anything',
          }),
        ]),
        importDraft,
        saveRecipe: async () => {},
      },
    );
    expect(results[0].outcome).toBe('already-saved');
    expect(importDraft).not.toHaveBeenCalled();
  });

  it('skips when the publisher’s canonical URL is the one already saved', async () => {
    const saveRecipe = vi.fn(async () => {});
    const results = await addCatalogEntries(
      [entry('chicken', 'https://example.com/chicken-and-rice?utm=week')],
      {
        existingKeys: new Set([
          recipeDuplicateKey({
            sourceUrl: 'https://example.com/chicken-and-rice',
            title: 'Chicken and rice',
          }),
        ]),
        importDraft: async () => draft(),
        saveRecipe,
      },
    );
    expect(results[0].outcome).toBe('already-saved');
    expect(saveRecipe).not.toHaveBeenCalled();
  });

  it('does not add the same recipe twice within one batch', async () => {
    const saveRecipe = vi.fn(async () => {});
    const results = await addCatalogEntries(
      [
        entry('one', 'https://example.com/chicken-and-rice'),
        entry('two', 'https://example.com/chicken-and-rice/'),
      ],
      { existingKeys: new Set(), importDraft: async () => draft(), saveRecipe },
    );
    expect(results.map((r) => r.outcome)).toEqual(['added', 'already-saved']);
    expect(saveRecipe).toHaveBeenCalledTimes(1);
  });

  it('reports one blocked publisher per entry and keeps going', async () => {
    const results = await addCatalogEntries(
      [
        entry('blocked', 'https://blocked.example/recipe'),
        entry('fine', 'https://example.com/chicken-and-rice'),
      ],
      {
        existingKeys: new Set(),
        importDraft: async (url) => {
          if (url.includes('blocked'))
            throw new Error('The recipe site would not let Forkast read that page.');
          return draft();
        },
        saveRecipe: async () => {},
      },
    );
    expect(results[0]).toMatchObject({
      outcome: 'failed',
      message: 'The recipe site would not let Forkast read that page.',
    });
    expect(results[1].outcome).toBe('added');
  });

  it('reports progress as each recipe lands', async () => {
    const seen: Array<[number, number]> = [];
    await addCatalogEntries(
      [
        entry('one', 'https://example.com/one'),
        entry('two', 'https://example.com/two'),
      ],
      {
        existingKeys: new Set(),
        importDraft: async (url) => draft({ sourceUrl: url }),
        saveRecipe: async () => {},
        onResult: (_result, done, total) => void seen.push([done, total]),
      },
    );
    expect(seen).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});

describe('reading a recipe once', () => {
  it('adds a previewed recipe without reading it again', async () => {
    const read = vi.fn(async () => draft());
    const cache = createDraftCache(read);
    await cache.get('https://example.com/chicken-and-rice');
    const results = await addCatalogEntries(
      [entry('chicken', 'https://example.com/chicken-and-rice')],
      { existingKeys: new Set(), importDraft: cache.get, saveRecipe: async () => {} },
    );
    expect(results[0].outcome).toBe('added');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('does not remember a failure', async () => {
    let attempt = 0;
    const cache = createDraftCache(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('The recipe site took too long to respond.');
      return draft();
    });
    await expect(cache.get('https://example.com/slow')).rejects.toThrow('too long');
    await expect(cache.get('https://example.com/slow')).resolves.toMatchObject({
      title: 'Chicken and rice',
    });
  });

  it('reports whether a recipe is already in hand', async () => {
    const cache = createDraftCache(async () => draft());
    expect(cache.peek('https://example.com/one')).toBeUndefined();
    await cache.get('https://example.com/one');
    expect(cache.peek('https://example.com/one')).toMatchObject({
      title: 'Chicken and rice',
    });
  });
});

describe('import pacing', () => {
  it('waits out the rest of the minute rather than being refused', async () => {
    let clock = 1_000;
    const waited: number[] = [];
    const announced: number[] = [];
    const pace = createImportPacer({
      now: () => clock,
      wait: async (ms) => {
        waited.push(ms);
        clock += ms;
      },
      onWait: (seconds) => void announced.push(seconds),
    });
    for (let i = 0; i < IMPORTS_PER_MINUTE; i++) {
      await pace(i);
      clock += 1_000;
    }
    expect(waited).toEqual([]);
    await pace(IMPORTS_PER_MINUTE);
    expect(waited).toEqual([60_000 - IMPORTS_PER_MINUTE * 1_000]);
    expect(announced).toEqual([60 - IMPORTS_PER_MINUTE]);
  });

  it('does not wait when the window has already passed', async () => {
    let clock = 0;
    const waited: number[] = [];
    const pace = createImportPacer({
      now: () => clock,
      wait: async (ms) => void waited.push(ms),
    });
    for (let i = 0; i < IMPORTS_PER_MINUTE; i++) await pace(i);
    clock += 61_000;
    await pace(IMPORTS_PER_MINUTE);
    expect(waited).toEqual([]);
  });
});
