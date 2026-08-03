import type { RecipeIngredient } from './types';

const unicodeFractions: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};
const units = [
  'cups?',
  'tablespoons?',
  'tbsp',
  'teaspoons?',
  'tsp',
  'ounces?',
  'oz',
  'pounds?',
  'lb',
  'grams?',
  'g',
  'kilograms?',
  'kg',
  'cloves?',
  'cans?',
  'packages?',
  'pinch(?:es)?',
];

export function normalizedIngredientName(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized) return normalized;
  const codepoints = Array.from(value.trim(), (character) =>
    character.codePointAt(0)!.toString(16),
  ).join('-');
  return codepoints ? `symbol-${codepoints}` : 'unnamed-item';
}

function parseNumber(value: string): number | null {
  if (unicodeFractions[value] != null) return unicodeFractions[value];
  if (/^\d+\/\d+$/.test(value)) {
    const [a, b] = value.split('/').map(Number);
    return b ? a / b : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseIngredient(
  rawText: string,
  id: string = crypto.randomUUID(),
): RecipeIngredient {
  const raw = rawText.trim();
  const match = raw.match(
    new RegExp(
      // The unit must end the word it starts, and may carry a trailing period:
      // without that, "1 garlic clove" reads as one gram of "arlic clove", and
      // "2 tbsp. dill" keeps the period at the front of the name.
      `^(?:(\\d+)\\s+)?(\\d+(?:\\.\\d+)?|\\d+\\/\\d+|[¼½¾⅓⅔⅛⅜⅝⅞])?(?:\\s*[-–]\\s*(\\d+(?:\\.\\d+)?|\\d+\\/\\d+|[¼½¾⅓⅔⅛⅜⅝⅞]))?\\s*(?:(${units.join('|')})\\.?(?=\\s|$)\\s*)?(.*)$`,
      'i',
    ),
  );
  const whole = match?.[1] ? Number(match[1]) : 0;
  const first = match?.[2] ? parseNumber(match[2]) : null;
  const quantity = first == null ? (whole > 0 ? whole : null) : whole + first;
  const quantityMax = match?.[3] ? parseNumber(match[3]) : null;
  const nameAndNote = (match?.[5] || raw).trim();
  const comma = nameAndNote.indexOf(',');
  const name = (comma >= 0 ? nameAndNote.slice(0, comma) : nameAndNote).trim() || raw;
  return {
    id,
    rawText: raw,
    quantity,
    quantityMax,
    unit: match?.[4]?.toLowerCase() ?? null,
    name,
    note: comma >= 0 ? nameAndNote.slice(comma + 1).trim() || null : null,
    scalable: quantity != null,
  };
}

export function scaleIngredient(ingredient: RecipeIngredient, factor: number) {
  if (
    !ingredient.scalable ||
    ingredient.quantity == null ||
    !Number.isFinite(factor) ||
    factor <= 0
  )
    return ingredient;
  return {
    ...ingredient,
    quantity: ingredient.quantity * factor,
    quantityMax:
      ingredient.quantityMax == null ? null : ingredient.quantityMax * factor,
  };
}

const fractionTargets: Array<[number, string]> = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.375, '⅜'],
  [0.5, '½'],
  [0.625, '⅝'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
  [0.875, '⅞'],
];
export function formatQuantity(value: number | null) {
  if (value == null) return '';
  const whole = Math.floor(value + 1e-8);
  const decimal = value - whole;
  const fraction = fractionTargets.find(
    ([target]) => Math.abs(decimal - target) < 0.025,
  )?.[1];
  if (fraction) return `${whole || ''}${fraction}`;
  if (Math.abs(decimal) < 0.025) return String(whole);
  return Number(value.toFixed(2)).toString();
}
