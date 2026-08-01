import { describe, expect, it } from 'vitest';
import { extractRecipeFromHtml } from '../lib/recipe-schema';
describe('schema.org recipe extraction', () => {
  it('reads graph, images and HowTo sections', () => {
    const html = `<link rel="canonical" href="https://example.com/canonical"><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Recipe","name":"Noodles","recipeYield":"4 servings","image":{"url":"https://example.com/a.jpg"},"recipeIngredient":["1 cup noodles"],"recipeInstructions":[{"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Boil."}]}]}]}</script>`;
    expect(extractRecipeFromHtml(html, 'https://example.com')).toMatchObject({
      title: 'Noodles',
      baseServings: 4,
      imageUrl: 'https://example.com/a.jpg',
      instructions: ['Boil.'],
      sourceUrl: 'https://example.com/canonical',
    });
  });
  it('ignores malformed blocks and returns null without a recipe', () =>
    expect(
      extractRecipeFromHtml(
        '<script type="application/ld+json">{bad</script>',
        'https://example.com',
      ),
    ).toBeNull());
});
