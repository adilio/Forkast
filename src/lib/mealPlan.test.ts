import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayName,
  longDay,
  planFactor,
  startOfWeek,
  todayISO,
  toISO,
  toLocalDate,
  weekDays,
  weekLabel,
} from './mealPlan';

describe('dates a household agreed on', () => {
  it('reads a date in local time, not UTC', () => {
    // new Date('2026-08-03') is midnight UTC, which is 2 August for anyone
    // behind it. This is the bug the plain-string rule exists to prevent.
    const date = toLocalDate('2026-08-03');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(3);
  });

  it('round-trips through a string unchanged', () => {
    for (const iso of ['2026-01-01', '2026-08-03', '2026-12-31']) {
      expect(toISO(toLocalDate(iso))).toBe(iso);
    }
  });

  it('pads single-digit months and days', () => {
    expect(toISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('takes today from the reader own clock', () => {
    expect(todayISO(new Date(2026, 7, 3, 23, 30))).toBe('2026-08-03');
    // Half an hour later it is tomorrow locally, whatever UTC says.
    expect(todayISO(new Date(2026, 7, 4, 0, 30))).toBe('2026-08-04');
  });
});

describe('moving between days', () => {
  it('adds and subtracts days', () => {
    expect(addDays('2026-08-03', 1)).toBe('2026-08-04');
    expect(addDays('2026-08-03', -1)).toBe('2026-08-02');
    expect(addDays('2026-08-03', 7)).toBe('2026-08-10');
  });

  it('crosses a month and a year boundary', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('survives a daylight-saving change', () => {
    // Whatever the local rules are, seven addDays steps must equal seven days.
    let iso = '2026-03-05';
    for (let i = 0; i < 7; i += 1) iso = addDays(iso, 1);
    expect(iso).toBe('2026-03-12');
    let back = '2026-11-08';
    for (let i = 0; i < 7; i += 1) back = addDays(back, 1);
    expect(back).toBe('2026-11-15');
  });
});

describe('the shopping week', () => {
  it('starts on Monday', () => {
    // 2026-08-03 is a Monday.
    expect(dayName('2026-08-03')).toBe('Monday');
    expect(startOfWeek('2026-08-03')).toBe('2026-08-03');
    expect(startOfWeek('2026-08-06')).toBe('2026-08-03');
    // Sunday belongs to the week that just finished, not the one starting.
    expect(dayName('2026-08-09')).toBe('Sunday');
    expect(startOfWeek('2026-08-09')).toBe('2026-08-03');
    expect(startOfWeek('2026-08-10')).toBe('2026-08-10');
  });

  it('lists seven consecutive days', () => {
    expect(weekDays('2026-08-03')).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ]);
  });

  it('labels a week, naming both months only when it straddles one', () => {
    expect(weekLabel('2026-08-03')).toBe('3 – 9 August');
    expect(weekLabel('2026-08-31')).toBe('31 August – 6 September');
  });

  it('names a day the way someone would say it', () => {
    expect(longDay('2026-08-04')).toBe('Tuesday 4 August');
  });
});

describe('scaling a planned meal', () => {
  it('is the ratio of planned servings to the recipe own yield', () => {
    expect(planFactor(8, 4)).toBe(2);
    expect(planFactor(2, 4)).toBe(0.5);
  });

  it('sends a recipe as written when either figure is missing', () => {
    expect(planFactor(null, 4)).toBe(1);
    expect(planFactor(4, null)).toBe(1);
    expect(planFactor(0, 4)).toBe(1);
    expect(planFactor(-2, 4)).toBe(1);
  });
});
