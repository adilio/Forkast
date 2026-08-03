import type { Store } from './types';

/**
 * Where an ingredient goes is a personal habit, not a household fact. Two
 * people sharing one list buy the same milk at different shops, and the
 * household's earlier single set of rules meant whoever sent ingredients last
 * silently retrained it for everyone.
 *
 * So routing resolves in layers, most personal first. The household layer is
 * the set of rules written before preferences were split; it is still read as
 * an inherited baseline so nobody's existing habits were thrown away, but it
 * is no longer written to.
 */
export type StoreRouting = {
  /** This person's own ingredient rules, keyed by normalized ingredient name. */
  mine: ReadonlyMap<string, string>;
  /** Rules the household shared before preferences were per person. */
  household: ReadonlyMap<string, string>;
  /** Where this person's unrecognized ingredients go. */
  defaultStoreId: string | null;
  /** The household's stores, in display order. */
  stores: readonly Store[];
};

/**
 * Why an ingredient landed where it did. The UI reports this rather than
 * moving items silently, because a list that reroutes without saying so reads
 * as a bug the first time it disagrees with you.
 */
export type RouteReason = 'mine' | 'household' | 'default' | 'only-store';

export type RoutedStore = { storeId: string; reason: RouteReason } | null;

/**
 * Resolves one ingredient to one store. Returns null only when the household
 * has no stores at all, which the caller must handle — routing an item into a
 * store that does not exist would be rejected by the security rules anyway.
 */
export function routeIngredient(
  normalizedName: string,
  routing: StoreRouting,
): RoutedStore {
  const exists = (storeId: string | undefined | null): storeId is string =>
    Boolean(storeId) && routing.stores.some((store) => store.id === storeId);

  const mine = routing.mine.get(normalizedName);
  if (exists(mine)) return { storeId: mine, reason: 'mine' };

  const household = routing.household.get(normalizedName);
  if (exists(household)) return { storeId: household, reason: 'household' };

  if (exists(routing.defaultStoreId))
    return { storeId: routing.defaultStoreId, reason: 'default' };

  const first = routing.stores[0];
  return first ? { storeId: first.id, reason: 'only-store' } : null;
}

/**
 * The store a person's next unrecognized ingredient would go to. Settings and
 * the recipe screen both explain the fallback before it is used, so it has to
 * be derived the same way routeIngredient derives it.
 */
export function fallbackStore(routing: StoreRouting): Store | null {
  const chosen = routing.stores.find((store) => store.id === routing.defaultStoreId);
  return chosen ?? routing.stores[0] ?? null;
}

const REASON_COPY: Record<RouteReason, string> = {
  mine: 'your usual store',
  household: 'the household’s earlier routing',
  default: 'your default store',
  'only-store': 'the only store set up',
};

export function describeReason(reason: RouteReason) {
  return REASON_COPY[reason];
}
