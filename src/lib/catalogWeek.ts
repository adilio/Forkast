/**
 * Picks the week's catalog selection.
 *
 * Deterministic from the date alone: both people in a household see the same
 * recipes in the same week, and nothing has to be stored or agreed on to make
 * that true. `Math.random()` would give the two phones different answers and
 * change the list on every render.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** The epoch fell on a Thursday; this shifts the count back to the Monday
 *  before it, so a new week starts on a Monday rather than mid-week. */
const MONDAY_BEFORE_EPOCH_MS = 3 * 24 * 60 * 60 * 1000;

/** Whole weeks since that Monday, counted in UTC so a device's time zone
 *  cannot shift the household onto a different week. */
export function weekIndex(date: Date): number {
  return Math.floor((date.getTime() + MONDAY_BEFORE_EPOCH_MS) / WEEK_MS);
}

/**
 * `count` entries for the given week, walking the catalog in order and wrapping
 * at the end, so every recipe comes up before any repeats and the selection
 * moves on by exactly one week's worth each week.
 */
/**
 * Reorders entries so neighbours come from different groups, by taking one
 * from each group in turn. The catalog is written site by site, and a straight
 * window over it hands out three recipes from one publisher — which reads as a
 * suggestion about the site rather than about dinner.
 */
export function spreadBy<T>(entries: T[], groupOf: (entry: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const key = groupOf(entry);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const queues = [...groups.values()];
  const spread: T[] = [];
  while (spread.length < entries.length)
    for (const queue of queues) {
      const next = queue.shift();
      if (next !== undefined) spread.push(next);
    }
  return spread;
}

export function weeklyPicks<T>(entries: T[], week: number, count: number): T[] {
  if (!entries.length || count <= 0) return [];
  const take = Math.min(count, entries.length);
  const start = (((week * take) % entries.length) + entries.length) % entries.length;
  return Array.from({ length: take }, (_, i) => entries[(start + i) % entries.length]);
}
