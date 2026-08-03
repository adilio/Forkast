import { describe, expect, it } from 'vitest';
import { fallbackStore, routeIngredient, type StoreRouting } from './storeRouting';
import type { Store } from './types';

const stores: Store[] = [
  { id: 'city-market', name: 'City Market', sortOrder: 0 },
  { id: 'costco', name: 'Costco', sortOrder: 1 },
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

describe('store routing', () => {
  it('prefers this person’s own rule over the household baseline', () => {
    const result = routeIngredient(
      'milk',
      routing({
        mine: new Map([['milk', 'costco']]),
        household: new Map([['milk', 'city-market']]),
      }),
    );
    expect(result).toEqual({ storeId: 'costco', reason: 'mine' });
  });

  it('inherits the household baseline where this person has no rule', () => {
    const result = routeIngredient(
      'milk',
      routing({ household: new Map([['milk', 'costco']]) }),
    );
    expect(result).toEqual({ storeId: 'costco', reason: 'household' });
  });

  it('falls back to this person’s default store for a new ingredient', () => {
    const result = routeIngredient('rhubarb', routing({ defaultStoreId: 'costco' }));
    expect(result).toEqual({ storeId: 'costco', reason: 'default' });
  });

  it('falls back to the first store when no default is set', () => {
    expect(routeIngredient('rhubarb', routing())).toEqual({
      storeId: 'city-market',
      reason: 'only-store',
    });
  });

  it('ignores rules pointing at a store that no longer exists', () => {
    // A deleted store must not route an item into a document the security
    // rules would reject anyway.
    const result = routeIngredient(
      'milk',
      routing({
        mine: new Map([['milk', 'closed-store']]),
        household: new Map([['milk', 'also-closed']]),
        defaultStoreId: 'costco',
      }),
    );
    expect(result).toEqual({ storeId: 'costco', reason: 'default' });
  });

  it('returns null when the household has no stores at all', () => {
    expect(routeIngredient('milk', routing({ stores: [] }))).toBeNull();
  });

  it('routes two people with different habits to different stores', () => {
    const shared = new Map([['milk', 'city-market']]);
    const adil = routing({ mine: new Map([['milk', 'costco']]), household: shared });
    const marla = routing({ mine: new Map(), household: shared });

    expect(routeIngredient('milk', adil)?.storeId).toBe('costco');
    expect(routeIngredient('milk', marla)?.storeId).toBe('city-market');
  });

  describe('fallbackStore', () => {
    it('names the default store when one is set', () => {
      expect(fallbackStore(routing({ defaultStoreId: 'costco' }))?.name).toBe('Costco');
    });
    it('names the first store when the default is unset or stale', () => {
      expect(fallbackStore(routing())?.name).toBe('City Market');
      expect(fallbackStore(routing({ defaultStoreId: 'gone' }))?.name).toBe(
        'City Market',
      );
    });
    it('names nothing when there are no stores', () => {
      expect(fallbackStore(routing({ stores: [] }))).toBeNull();
    });
  });
});
