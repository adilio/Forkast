export const SLOTS = ['breakfast', 'lunch', 'dinner', 'other'] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  other: 'Something else',
};

/**
 * A planned meal's date is a plain `YYYY-MM-DD` string, never a timestamp.
 *
 * A household calendar says Tuesday because the household agreed on Tuesday. A
 * timestamp says Tuesday only for readers in the time zone it was written in,
 * so the same dinner shows up on Monday night for anyone west of it. Every
 * function here therefore works in the reader's own local time and hands back
 * strings.
 *
 * That also means never passing one of these strings to `new Date(iso)`, which
 * parses a bare date as UTC and lands on the previous evening for anyone behind
 * it. `toLocalDate` is the only way in.
 */
export function toLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toISO(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

export function addDays(iso: string, days: number): string {
  const date = toLocalDate(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

/** The Monday on or before `iso`. Weeks start on Monday, as a shopping week does. */
export function startOfWeek(iso: string): string {
  const date = toLocalDate(iso);
  const shift = (date.getDay() + 6) % 7;
  return addDays(iso, -shift);
}

export function weekDays(startIso: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(startIso, index));
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function dayName(iso: string): string {
  return DAY_NAMES[toLocalDate(iso).getDay()];
}

/** "Tuesday 5 August", the way someone would say it out loud. */
export function longDay(iso: string): string {
  const date = toLocalDate(iso);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

/** "4 – 10 August", or both months when the week straddles one. */
export function weekLabel(startIso: string): string {
  const start = toLocalDate(startIso);
  const end = toLocalDate(addDays(startIso, 6));
  const startPart =
    start.getMonth() === end.getMonth()
      ? String(start.getDate())
      : `${start.getDate()} ${MONTH_NAMES[start.getMonth()]}`;
  return `${startPart} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
}

/**
 * The factor for a planned meal: how many servings were planned against what
 * the recipe is written for. Falls back to 1 when either is missing, so a
 * recipe with no stated yield is sent as written rather than as a guess.
 */
export function planFactor(
  servings: number | null,
  baseServings: number | null,
): number {
  if (!servings || !baseServings || servings <= 0 || baseServings <= 0) return 1;
  return servings / baseServings;
}
