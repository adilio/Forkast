/**
 * Checks that every catalog entry still yields a recipe.
 *
 * The catalog is a live dependency on other people's websites: a publisher can
 * move a URL or start blocking, and a stale entry is a broken feature rather
 * than a broken link. This runs the real extractor over the real pages, so it
 * proves the same path the import function takes.
 *
 *   node --experimental-strip-types scripts/verify-catalog.ts
 *
 * Deliberately not part of `npm run check`: it makes forty-odd requests to
 * other people's servers, which is not something CI should do on every push.
 */
import { catalog } from '../src/data/catalog.ts';
import { extractRecipeFromHtml } from '../netlify/lib/recipe-schema.ts';

const USER_AGENT = 'Forkast/1.0 household recipe importer (+https://forkast.4dl.ca)';
const CONCURRENCY = 4;

async function check(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    });
    if (!response.ok) return `HTTP ${response.status}`;
    const recipe = extractRecipeFromHtml(await response.text(), response.url);
    if (!recipe) return 'no Recipe JSON-LD';
    // The extractor returns `ingredientLines`, not `ingredients`; reading the
    // wrong field here would report every entry as empty.
    if (recipe.ingredientLines.length < 3) return 'too few ingredients';
    if (!recipe.instructions.length) return 'no directions';
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'failed';
  } finally {
    clearTimeout(timer);
  }
}

const queue = [...catalog];
const failures: string[] = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const entry = queue.shift()!;
      const problem = await check(entry.url);
      console.log(
        `${problem ? 'FAIL' : ' ok '} ${entry.id}${problem ? ` — ${problem}` : ''}`,
      );
      if (problem) failures.push(`${entry.id}: ${problem} (${entry.url})`);
    }
  }),
);

console.log(`\n${catalog.length - failures.length}/${catalog.length} entries verified`);
if (failures.length) {
  for (const failure of failures) console.log(failure);
  process.exitCode = 1;
}
