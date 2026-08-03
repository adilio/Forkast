import { describe, expect, it } from 'vitest';
import { canRemoveStore, moveStore, storeNameProblem } from './stores';
import type { Store } from './types';

const stores: Store[] = [
  { id: 'a', name: 'City Market', sortOrder: 0 },
  { id: 'b', name: 'Costco', sortOrder: 1 },
  { id: 'c', name: 'The bakery', sortOrder: 2 },
];

describe('reordering stores', () => {
  it('moves a store up and down one position', () => {
    expect(moveStore(stores, 'b', -1).map((s) => s.id)).toEqual(['b', 'a', 'c']);
    expect(moveStore(stores, 'b', 1).map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('leaves the order alone at either end', () => {
    expect(moveStore(stores, 'a', -1).map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(moveStore(stores, 'c', 1).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('leaves the order alone for a store that is not there', () => {
    expect(moveStore(stores, 'gone', -1).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('naming a store', () => {
  it('accepts a new name', () => {
    expect(storeNameProblem('Safeway', stores)).toBe('');
  });

  it('refuses an empty or whitespace name', () => {
    expect(storeNameProblem('', stores)).toMatch(/name/i);
    expect(storeNameProblem('   ', stores)).toMatch(/name/i);
  });

  it('refuses a name already in use, whatever the case or padding', () => {
    expect(storeNameProblem('costco', stores)).toMatch(/already have/i);
    expect(storeNameProblem('  Costco  ', stores)).toMatch(/already have/i);
  });

  it('lets a store keep its own name while being renamed', () => {
    expect(storeNameProblem('Costco', stores, 'b')).toBe('');
    expect(storeNameProblem('Costco', stores, 'a')).toMatch(/already have/i);
  });

  it('refuses a name too long to read on a phone', () => {
    expect(storeNameProblem('x'.repeat(61), stores)).toMatch(/characters/i);
    expect(storeNameProblem('x'.repeat(60), stores)).toBe('');
  });
});

describe('removing a store', () => {
  it('refuses to remove the last one, which would leave nowhere to shop', () => {
    expect(canRemoveStore(stores)).toBe(true);
    expect(canRemoveStore([stores[0]])).toBe(false);
    expect(canRemoveStore([])).toBe(false);
  });
});
