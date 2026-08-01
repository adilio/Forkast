import type { Recipe } from './types';
import { normalizedIngredientName } from './ingredients';

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
