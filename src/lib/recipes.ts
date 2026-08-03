import type { Recipe } from './types';
import { normalizedIngredientName, parseIngredient } from './ingredients';

/**
 * What `import-recipe` returns: an untrusted draft, not a saved recipe. Note
 * `ingredientLines` — the extractor hands back the publisher's raw lines, and
 * reading an `ingredients` field here would silently produce empty recipes.
 */
export type ImportedDraft = {
  title: string;
  description: string;
  sourceUrl: string;
  imageUrl: string;
  baseServings: number | null;
  ingredientLines: string[];
  instructions: string[];
  notes: string;
  tags: string[];
};

/** The bare host a recipe came from, for attribution. '' when there is none. */
export function sourceHostOf(url: string): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

export function draftToRecipe(draft: ImportedDraft): Recipe {
  return {
    ...emptyRecipe(),
    title: draft.title,
    sourceHost: sourceHostOf(draft.sourceUrl),
    description: draft.description,
    sourceUrl: draft.sourceUrl,
    imageUrl: draft.imageUrl,
    baseServings: draft.baseServings,
    ingredients: draft.ingredientLines.map((line) => parseIngredient(line)),
    instructions: draft.instructions,
    notes: draft.notes,
    tags: draft.tags,
  };
}

export function recipeDuplicateKey(recipe: Pick<Recipe, 'sourceUrl' | 'title'>) {
  return recipe.sourceUrl
    ? `url:${recipe.sourceUrl.toLowerCase().replace(/\/$/, '')}`
    : `title:${normalizedIngredientName(recipe.title)}`;
}

export const emptyRecipe = (): Recipe => ({
  id: '',
  title: '',
  description: '',
  sourceUrl: '',
  sourceHost: '',
  imageUrl: '',
  baseServings: 4,
  ingredients: [],
  instructions: [],
  notes: '',
  tags: [],
  starred: false,
  importMetadata: {},
});
