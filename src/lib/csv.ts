import Papa from 'papaparse';
import { parseIngredient, normalizedIngredientName } from './ingredients';
import type { Recipe } from './types';
import { recipeDuplicateKey } from './recipes';

const aliases: Record<string, string[]> = {
  title: ['title', 'recipe title', 'name'],
  description: ['description', 'summary'],
  servings: ['servings', 'yield'],
  ingredients: ['ingredients', 'ingredient list'],
  instructions: ['directions', 'instructions', 'steps'],
  sourceUrl: ['source url', 'url', 'web link'],
  imageUrl: ['photo url', 'image url', 'photo'],
  notes: ['notes', 'comments'],
  tags: ['tags', 'categories'],
  starred: ['favorite', 'favourite', 'starred'],
};
const norm = (x: string) => x.toLowerCase().trim();
export type CsvPreview = {
  recipes: Recipe[];
  warnings: string[];
  columns: string[];
  unknownColumns: string[];
};
export function parsePlanToEatCsv(csv: string): CsvPreview {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const columns = parsed.meta.fields ?? [];
  const map = new Map<string, string>();
  for (const [target, names] of Object.entries(aliases)) {
    const found = columns.find((c) => names.includes(norm(c)));
    if (found) map.set(target, found);
  }
  const unknownColumns = columns.filter((c) => ![...map.values()].includes(c));
  const warnings = [
    ...parsed.errors.map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`),
  ];
  const seen = new Set<string>();
  const recipes: Recipe[] = [];
  parsed.data.forEach((row, index) => {
    const get = (key: string) => row[map.get(key) ?? '']?.trim() ?? '';
    const title = get('title');
    if (!title) {
      warnings.push(`Row ${index + 2}: missing title`);
      return;
    }
    const sourceUrl = get('sourceUrl');
    const duplicateKey = recipeDuplicateKey({ sourceUrl, title });
    if (seen.has(duplicateKey)) {
      warnings.push(`Row ${index + 2}: duplicate ${title} skipped`);
      return;
    }
    seen.add(duplicateKey);
    const metadata = Object.fromEntries(
      unknownColumns.filter((c) => row[c]).map((c) => [c, row[c]]),
    );
    recipes.push({
      id: '',
      title,
      description: get('description'),
      sourceUrl,
      sourceHost: (() => {
        try {
          return sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : '';
        } catch {
          return '';
        }
      })(),
      imageUrl: get('imageUrl'),
      baseServings: Number(get('servings').match(/[\d.]+/)?.[0]) || null,
      ingredients: get('ingredients')
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x, i) => parseIngredient(x, `${index}-${i}`)),
      instructions: get('instructions')
        .split(/\r?\n|\n\s*\n/)
        .map((x) => x.replace(/^\d+[.)]\s*/, '').trim())
        .filter(Boolean),
      notes: get('notes'),
      tags: get('tags')
        .split(/[,;]/)
        .map((x) => x.trim())
        .filter(Boolean),
      starred: /^(1|true|yes|y)$/i.test(get('starred')),
      importMetadata: { ...metadata, normalizedTitle: normalizedIngredientName(title) },
    });
  });
  return { recipes, warnings, columns, unknownColumns };
}
