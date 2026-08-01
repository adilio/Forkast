import { z } from 'zod';

export const ingredientSchema = z.object({
  id: z.string(),
  rawText: z.string(),
  quantity: z.number().nullable(),
  quantityMax: z.number().nullable(),
  unit: z.string().nullable(),
  name: z.string().min(1),
  note: z.string().nullable(),
  scalable: z.boolean(),
});
export type RecipeIngredient = z.infer<typeof ingredientSchema>;

export const recipeSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().default(''),
  sourceUrl: z.string().default(''),
  sourceHost: z.string().default(''),
  imageUrl: z.string().default(''),
  baseServings: z.number().positive().nullable(),
  ingredients: z.array(ingredientSchema),
  instructions: z.array(z.string()),
  notes: z.string().default(''),
  tags: z.array(z.string()).default([]),
  starred: z.boolean().default(false),
  importMetadata: z.record(z.string(), z.unknown()).default({}),
});
export type Recipe = z.infer<typeof recipeSchema>;

export type Store = { id: string; name: string; sortOrder: number };
export type ShoppingItem = {
  id: string;
  name: string;
  normalizedName: string;
  quantity: number | null;
  quantityMax: number | null;
  unit: string | null;
  note: string | null;
  storeId: string;
  checked: boolean;
  manual: boolean;
  sourceRecipeId: string | null;
  sourceIngredientId: string | null;
};
