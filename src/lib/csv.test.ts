import { describe, expect, it } from 'vitest';
import { parsePlanToEatCsv } from './csv';
describe('Plan to Eat import', () => {
  it('maps known columns and preserves unknown values', () => {
    const result = parsePlanToEatCsv(
      'Title,Servings,Ingredients,Directions,Legacy ID\n"Soup",4,"1 cup beans\nSalt","Mix\nCook",abc',
    );
    expect(result.recipes).toHaveLength(1);
    expect(result.recipes[0]).toMatchObject({
      title: 'Soup',
      baseServings: 4,
      importMetadata: { 'Legacy ID': 'abc' },
    });
    expect(result.recipes[0].ingredients).toHaveLength(2);
  });
  it('warns and skips duplicate titles', () => {
    const result = parsePlanToEatCsv('Title\nSoup\nSoup');
    expect(result.recipes).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.includes('duplicate'))).toBe(true);
  });
  it('treats trailing-slash source URLs as the same recipe', () => {
    const result = parsePlanToEatCsv(
      'Title,URL\nSoup,https://example.com/soup\nSoup again,https://example.com/soup/',
    );
    expect(result.recipes).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.includes('duplicate'))).toBe(true);
  });
});
