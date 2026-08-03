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

/** A person in the household. `displayName` is written server-side at join. */
export type Member = {
  id: string;
  displayName: string;
  role: 'owner' | 'member';
};

/**
 * One person's shopping habits. The list is shared; where things are bought is
 * not, so this is keyed by uid and only its owner may write it.
 */
export type MemberPrefs = { defaultStoreId: string | null };
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
  /** Server-populated on write; the list uses it to say who added an item. */
  createdBy: string;
};

/** What a caller supplies. Identity and timestamps are stamped on write. */
export type NewShoppingItem = Omit<ShoppingItem, 'id' | 'createdBy'>;

/**
 * One recipe placed on one day. `date` is a plain `YYYY-MM-DD` string and must
 * stay one — see the note in lib/mealPlan.ts on why a timestamp would move a
 * household's Tuesday.
 */
export type PlannedMeal = {
  id: string;
  date: string;
  slot: 'breakfast' | 'lunch' | 'dinner' | 'other';
  recipeId: string;
  /** How many this meal is for; null means "as the recipe is written". */
  servings: number | null;
  note: string | null;
};

export type NewPlannedMeal = Omit<PlannedMeal, 'id'>;
