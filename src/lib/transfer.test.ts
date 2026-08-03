import { describe, expect, it, vi } from 'vitest';
import { emptyRecipe } from './recipes';
import { REMEMBERED, mergeRouted, sendIngredientsToList } from './transfer';
import type { StoreRouting } from './storeRouting';
import type { NewShoppingItem, Recipe } from './types';

const stores = [
  { id: 'market', name: 'City Market', sortOrder: 0 },
  { id: 'club', name: 'Costco', sortOrder: 1 },
];

function routing(overrides: Partial<StoreRouting> = {}): StoreRouting {
  return {
    mine: new Map(),
    household: new Map(),
    defaultStoreId: null,
    stores,
    ...overrides,
  };
}

function recipe(): Recipe {
  return {
    ...emptyRecipe(),
    id: 'r1',
    title: 'Chicken and rice',
    baseServings: 4,
    ingredients: [
      {
        id: 'i1',
        rawText: '2 cups rice',
        quantity: 2,
        quantityMax: null,
        unit: 'cups',
        name: 'rice',
        note: null,
        scalable: true,
      },
      {
        id: 'i2',
        rawText: 'salt to taste',
        quantity: null,
        quantityMax: null,
        unit: null,
        name: 'salt',
        note: null,
        scalable: false,
      },
    ],
  };
}

function spy() {
  const added: NewShoppingItem[] = [];
  const remembered: Array<[string, string]> = [];
  return {
    added,
    remembered,
    deps: {
      addIngredient: async (item: NewShoppingItem) => void added.push(item),
      rememberStore: async (name: string, storeId: string) =>
        void remembered.push([name, storeId]),
    },
  };
}

describe('sending a recipe to the list', () => {
  it('scales what may be scaled and leaves the rest alone', async () => {
    const { added, deps } = spy();
    await sendIngredientsToList(
      { recipe: recipe(), factor: 2, target: 'market', routing: routing() },
      deps,
    );
    expect(added.map((item) => [item.name, item.quantity])).toEqual([
      ['rice', 4],
      ['salt', null],
    ]);
  });

  it('sends only the chosen ingredients', async () => {
    const { added, deps } = spy();
    await sendIngredientsToList(
      {
        recipe: recipe(),
        factor: 1,
        include: new Set(['i2']),
        target: 'market',
        routing: routing(),
      },
      deps,
    );
    expect(added.map((item) => item.name)).toEqual(['salt']);
  });

  it('routes each ingredient by habit when no store is chosen', async () => {
    const { added, deps } = spy();
    await sendIngredientsToList(
      {
        recipe: recipe(),
        factor: 1,
        target: REMEMBERED,
        routing: routing({ mine: new Map([['rice', 'club']]) }),
      },
      deps,
    );
    expect(added.map((item) => [item.name, item.storeId])).toEqual([
      ['rice', 'club'],
      // Unrecognized, so it falls through to the household's first store.
      ['salt', 'market'],
    ]);
  });

  it('learns where an explicitly chosen store puts an ingredient', async () => {
    const { remembered, deps } = spy();
    const result = await sendIngredientsToList(
      { recipe: recipe(), factor: 1, target: 'club', routing: routing() },
      deps,
    );
    expect(remembered).toEqual([
      ['rice', 'club'],
      ['salt', 'club'],
    ]);
    expect(result.learned).toEqual([
      { normalizedName: 'rice', storeId: 'club' },
      { normalizedName: 'salt', storeId: 'club' },
    ]);
  });

  it('counts what landed where, for the receipt', async () => {
    const { deps } = spy();
    const result = await sendIngredientsToList(
      {
        recipe: recipe(),
        factor: 1,
        target: REMEMBERED,
        routing: routing({ mine: new Map([['rice', 'club']]) }),
      },
      deps,
    );
    expect([...result.routed]).toEqual([
      ['club', 1],
      ['market', 1],
    ]);
    expect(result.skipped).toBe(0);
  });

  it('skips rather than throws when the household has no stores at all', async () => {
    const { added, deps } = spy();
    const result = await sendIngredientsToList(
      {
        recipe: recipe(),
        factor: 1,
        target: REMEMBERED,
        routing: routing({ stores: [] }),
      },
      deps,
    );
    expect(added).toEqual([]);
    expect(result.skipped).toBe(2);
  });

  it('keeps what already landed when a later ingredient fails', async () => {
    const added: NewShoppingItem[] = [];
    const addIngredient = vi
      .fn()
      .mockImplementationOnce(async (item: NewShoppingItem) => void added.push(item))
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      sendIngredientsToList(
        { recipe: recipe(), factor: 1, target: 'market', routing: routing() },
        { addIngredient, rememberStore: async () => {} },
      ),
    ).rejects.toThrow('offline');
    expect(added.map((item) => item.name)).toEqual(['rice']);
  });
});

describe('merging receipts across several recipes', () => {
  it('adds up the per-store counts', () => {
    expect([
      ...mergeRouted([
        new Map([
          ['market', 2],
          ['club', 1],
        ]),
        new Map([['market', 3]]),
      ]),
    ]).toEqual([
      ['market', 5],
      ['club', 1],
    ]);
  });
});
