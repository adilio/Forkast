import { normalizedIngredientName, scaleIngredient } from './ingredients';
import { routeIngredient, type StoreRouting } from './storeRouting';
import type { NewShoppingItem, Recipe } from './types';

/** A specific store, or 'remembered' to let each ingredient's own habit decide. */
export const REMEMBERED = 'remembered';

export type TransferDeps = {
  addIngredient: (item: NewShoppingItem) => Promise<void>;
  rememberStore: (name: string, storeId: string) => Promise<void>;
};

export type TransferResult = {
  /** How many ingredients landed at each store, for the receipt. */
  routed: Map<string, number>;
  /** Ingredient names whose store this transfer learned, for local state. */
  learned: Array<{ normalizedName: string; storeId: string }>;
  /** Ingredients with nowhere to go, which happens only with no stores at all. */
  skipped: number;
};

/**
 * Scales a recipe's ingredients and sends them to the shopping list, one at a
 * time so a failure part-way leaves what already landed rather than rolling
 * back a shop someone may already be walking.
 *
 * The recipe screen and the meal plan both come through here. They differ only
 * in where the servings figure comes from — a slider in one, a planned meal in
 * the other — and that difference is the `factor` argument.
 *
 * Sending an ingredient also teaches Forkast where you buy it, so the next
 * transfer routes it without asking. That is why this writes a store rule even
 * when the destination was picked explicitly: an explicit choice is the
 * strongest evidence there is about where someone shops.
 */
export async function sendIngredientsToList(
  {
    recipe,
    factor,
    include,
    target,
    routing,
  }: {
    recipe: Recipe;
    factor: number;
    /** Ingredient ids to send; omit to send all of them. */
    include?: ReadonlySet<string>;
    target: string;
    routing: StoreRouting;
  },
  deps: TransferDeps,
): Promise<TransferResult> {
  const routed = new Map<string, number>();
  const learned: TransferResult['learned'] = [];
  let skipped = 0;

  for (const ingredient of recipe.ingredients) {
    if (include && !include.has(ingredient.id)) continue;
    const scaled = scaleIngredient(ingredient, factor);
    const normalizedName = normalizedIngredientName(scaled.name);
    const destination =
      target === REMEMBERED
        ? routeIngredient(normalizedName, routing)?.storeId
        : target;
    if (!destination) {
      skipped += 1;
      continue;
    }
    await deps.addIngredient({
      name: scaled.name,
      normalizedName,
      quantity: scaled.quantity,
      quantityMax: scaled.quantityMax,
      unit: scaled.unit,
      note: scaled.note,
      storeId: destination,
      checked: false,
      manual: false,
      sourceRecipeId: recipe.id,
      sourceIngredientId: ingredient.id,
    });
    await deps.rememberStore(scaled.name, destination);
    routed.set(destination, (routed.get(destination) ?? 0) + 1);
    learned.push({ normalizedName, storeId: destination });
  }

  return { routed, learned, skipped };
}

/** Merges several transfers into one set of per-store counts. */
export function mergeRouted(results: Array<Map<string, number>>) {
  const total = new Map<string, number>();
  for (const result of results)
    for (const [storeId, count] of result)
      total.set(storeId, (total.get(storeId) ?? 0) + count);
  return total;
}
