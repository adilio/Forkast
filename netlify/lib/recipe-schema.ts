import { load } from 'cheerio';
import { decodeHTML } from 'entities';

type JsonLd = Record<string, unknown>;
const asArray = <T>(v: T | T[] | undefined | null): T[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];
function recipeNodes(value: unknown): JsonLd[] {
  if (Array.isArray(value)) return value.flatMap(recipeNodes);
  if (!value || typeof value !== 'object') return [];
  const node = value as JsonLd;
  const own = asArray(node['@type'] as string | string[]).includes('Recipe')
    ? [node]
    : [];
  return [
    ...own,
    ...recipeNodes(node['@graph']),
    ...recipeNodes(node.mainEntity),
    ...recipeNodes(node.itemListElement),
  ];
}
function text(value: unknown): string {
  if (typeof value === 'string') return decodeHTML(value).trim();
  if (value && typeof value === 'object' && 'text' in value)
    return text((value as JsonLd).text);
  return '';
}
function instructions(value: unknown): string[] {
  return asArray(value).flatMap((item) => {
    if (typeof item === 'string')
      return item
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter(Boolean);
    if (!item || typeof item !== 'object') return [];
    const node = item as JsonLd;
    if (node['@type'] === 'HowToSection') return instructions(node.itemListElement);
    const valueText = text(node);
    return valueText ? [valueText] : [];
  });
}
function image(value: unknown): string {
  if (typeof value === 'string') return text(value);
  if (Array.isArray(value)) return image(value[0]);
  if (value && typeof value === 'object')
    return text((value as JsonLd).url) || text((value as JsonLd).contentUrl);
  return '';
}
function servings(value: unknown): number | null {
  const match = text(value).match(/[\d.]+/);
  return match ? Number(match[0]) || null : null;
}
export function extractRecipeFromHtml(html: string, sourceUrl: string) {
  const $ = load(html);
  const candidates: JsonLd[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      candidates.push(...recipeNodes(JSON.parse($(el).text())));
    } catch {
      /* malformed blocks are ignored */
    }
  });
  const node = candidates[0];
  if (!node) return null;
  const canonical = $('link[rel="canonical"]').attr('href') || sourceUrl;
  return {
    title: text(node.name),
    description: text(node.description),
    sourceUrl: canonical,
    imageUrl: image(node.image),
    baseServings: servings(node.recipeYield),
    ingredientLines: asArray(node.recipeIngredient).map(text).filter(Boolean),
    instructions: instructions(node.recipeInstructions),
    notes: '',
    tags: asArray(node.recipeCategory)
      .flatMap((x) => text(x).split(','))
      .map((x) => x.trim())
      .filter(Boolean),
  };
}
