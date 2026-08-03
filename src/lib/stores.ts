import type { Store } from './types';

export const STORE_NAME_MAX = 60;

/**
 * The store list is small and reordered rarely, so it moves one position at a
 * time rather than by dragging. Dragging a four-item list one-handed in a shop
 * is worse than two buttons, and this is settings, not the shopping tab.
 *
 * Returns the same array when the move would fall off either end, so the caller
 * can skip the write.
 */
export function moveStore(
  stores: readonly Store[],
  id: string,
  delta: -1 | 1,
): Store[] {
  const from = stores.findIndex((store) => store.id === id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= stores.length) return [...stores];
  const next = [...stores];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/**
 * Why a store name will not do, or '' when it will. Two stores with the same
 * name are not corrupt — items reference an id — but every screen that asks
 * "which store?" becomes a guess, so it is refused at the point of naming.
 */
export function storeNameProblem(
  name: string,
  existing: readonly Store[],
  selfId?: string,
): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Give the store a name.';
  if (trimmed.length > STORE_NAME_MAX)
    return `Keep the name under ${STORE_NAME_MAX} characters.`;
  const taken = existing.some(
    (store) =>
      store.id !== selfId && store.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  return taken ? `You already have a store called ${trimmed}.` : '';
}

/**
 * Whether a store may be removed. The last one may not: with no stores at all
 * nothing can be added to a list, routing has nowhere to send an ingredient,
 * and the household would need a developer to recover.
 */
export function canRemoveStore(stores: readonly Store[]): boolean {
  return stores.length > 1;
}
