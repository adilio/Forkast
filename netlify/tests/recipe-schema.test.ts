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

  it('decodes HTML entities in untrusted JSON-LD strings', () => {
    const html = `<script type="application/ld+json">{"@type":"Recipe","name":"Fish &amp; Chips","description":"Crisp &amp; quick","image":"https://example.com/image?a=1&amp;b=2","recipeYield":"2 servings","recipeIngredient":["2 &frac12; cups potatoes"],"recipeInstructions":[{"@type":"HowToStep","text":"Don&#8217;t overcook."}],"recipeCategory":"Dinner &amp; supper"}</script>`;

    expect(extractRecipeFromHtml(html, 'https://example.com/recipe')).toMatchObject({
      title: 'Fish & Chips',
      description: 'Crisp & quick',
      imageUrl: 'https://example.com/image?a=1&b=2',
      ingredientLines: ['2 ½ cups potatoes'],
      instructions: ['Don’t overcook.'],
      tags: ['Dinner & supper'],
    });
  });
});
