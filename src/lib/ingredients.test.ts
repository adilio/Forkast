import { describe, expect, it } from 'vitest';
import {
  formatQuantity,
  normalizedIngredientName,
  parseIngredient,
  scaleIngredient,
} from './ingredients';

describe('ingredient quantities', () => {
  it.each([
    ['2 cups flour', 2, 'cups', 'flour'],
    ['1 ½ cups milk', 1.5, 'cups', 'milk'],
    ['¾ tsp salt', 0.75, 'tsp', 'salt'],
    ['to taste', null, null, 'to taste'],
    // A unit only counts when it is a whole word: "garlic" is not grams.
    ['1 garlic clove, minced', 1, null, 'garlic clove'],
    ['2 large eggs', 2, null, 'large eggs'],
    ['1 lb ground beef', 1, 'lb', 'ground beef'],
    // Publishers often abbreviate with a period; it belongs to the unit.
    ['2 tbsp. finely chopped dill', 2, 'tbsp', 'finely chopped dill'],
    // A written fraction is a quantity, not a whole number and a stray slash.
    ['1/2 tsp garlic powder', 0.5, 'tsp', 'garlic powder'],
    ['1 1/2 cups milk', 1.5, 'cups', 'milk'],
    ['1/4-1/2 tsp cayenne', 0.25, 'tsp', 'cayenne'],
  ])('parses %s', (raw, q, unit, name) => {
    const parsed = parseIngredient(raw, 'x');
    expect(parsed).toMatchObject({ quantity: q, unit, name });
  });
  it('scales a range without mutating the base', () => {
    const base = {
      ...parseIngredient('1-2 cups berries', 'x'),
      quantity: 1,
      quantityMax: 2,
    };
    const scaled = scaleIngredient(base, 1.5);
    expect(scaled.quantity).toBe(1.5);
    expect(scaled.quantityMax).toBe(3);
    expect(base.quantity).toBe(1);
  });
  it.each([
    [1.5, '1½'],
    [0.333, '⅓'],
    [2.126, '2⅛'],
    [1.2, '1.2'],
  ])('formats %s', (n, text) => expect(formatQuantity(n as number)).toBe(text));
  it.each([
    ['Crème fraîche', 'creme fraiche'],
    ['味噌', '味噌'],
    ['🧂', 'symbol-1f9c2'],
  ])('normalizes international ingredient %s', (name, expected) => {
    expect(normalizedIngredientName(name)).toBe(expected);
  });
});
