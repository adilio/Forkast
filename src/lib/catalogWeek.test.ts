import { describe, expect, it } from 'vitest';
import { catalog } from '../data/catalog';
import { spreadBy, weekIndex, weeklyPicks } from './catalogWeek';

const entries = ['a', 'b', 'c', 'd', 'e'];

describe('recipes of the week', () => {
  it('gives the same week the same recipes', () => {
    expect(weeklyPicks(entries, 42, 3)).toEqual(weeklyPicks(entries, 42, 3));
  });

  it('moves on to different recipes the next week', () => {
    expect(weeklyPicks(entries, 0, 2)).toEqual(['a', 'b']);
    expect(weeklyPicks(entries, 1, 2)).toEqual(['c', 'd']);
  });

  it('wraps around the end of the catalog', () => {
    expect(weeklyPicks(entries, 2, 2)).toEqual(['e', 'a']);
  });

  it('shows every recipe before repeating one', () => {
    const shown = new Set<string>();
    for (let week = 0; week < 3; week++)
      for (const pick of weeklyPicks(entries, week, 2)) shown.add(pick);
    expect(shown.size).toBe(entries.length);
  });

  it('never asks for more than the catalog holds', () => {
    expect(weeklyPicks(entries, 3, 99)).toHaveLength(entries.length);
    expect(weeklyPicks([], 3, 2)).toEqual([]);
    expect(weeklyPicks(entries, 3, 0)).toEqual([]);
  });

  it('handles dates before the epoch without running off the front', () => {
    expect(weeklyPicks(entries, -1, 2)).toEqual(['d', 'e']);
  });

  it('turns over on Monday, not mid-week', () => {
    // 2026-08-03 is a Monday.
    expect(weekIndex(new Date('2026-08-02T23:59:00Z'))).toBe(
      weekIndex(new Date('2026-08-03T00:01:00Z')) - 1,
    );
    expect(weekIndex(new Date('2026-08-03T00:01:00Z'))).toBe(
      weekIndex(new Date('2026-08-09T23:59:00Z')),
    );
  });

  it('counts weeks in UTC so both phones agree', () => {
    expect(weekIndex(new Date('2026-08-03T23:30:00Z'))).toBe(
      weekIndex(new Date('2026-08-04T06:30:00Z')),
    );
    expect(weekIndex(new Date('2026-08-10T12:00:00Z'))).toBe(
      weekIndex(new Date('2026-08-03T12:00:00Z')) + 1,
    );
  });

  it('picks real catalog entries', () => {
    const picks = weeklyPicks(catalog, weekIndex(new Date('2026-08-03T12:00:00Z')), 3);
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((entry) => entry.id)).size).toBe(3);
  });
});

describe('spreading a catalog across sites', () => {
  const bySite = (entry: { site: string }) => entry.site;
  const rows = [
    { id: 1, site: 'a' },
    { id: 2, site: 'a' },
    { id: 3, site: 'a' },
    { id: 4, site: 'b' },
    { id: 5, site: 'c' },
  ];

  it('keeps every entry exactly once', () => {
    expect(
      spreadBy(rows, bySite)
        .map((row) => row.id)
        .sort(),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it('takes one site at a time so neighbours differ', () => {
    expect(spreadBy(rows, bySite).map((row) => row.site)).toEqual([
      'a',
      'b',
      'c',
      'a',
      'a',
    ]);
  });

  it('gives no week three recipes from one site', () => {
    const spread = spreadBy(catalog, (entry) => entry.siteName);
    for (let week = 0; week < 20; week++) {
      const sites = weeklyPicks(spread, week, 3).map((entry) => entry.siteName);
      expect(new Set(sites).size).toBeGreaterThan(1);
    }
  });
});
