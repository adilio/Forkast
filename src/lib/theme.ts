import { useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const KEY = 'forkast:theme';
const DARK = '(prefers-color-scheme: dark)';

/**
 * The canvas of each theme, mirrored from `styles.css`. iOS tints the status
 * bar of an installed PWA with this, so a stale value is visible as a seam
 * above the app rather than as a subtle mismatch.
 */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#f4f3ee',
  dark: '#131714',
};

function readPref(): ThemePref {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
  } catch {
    // Private browsing or disabled storage. The system setting still works.
    return 'system';
  }
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref !== 'system') return pref;
  return window.matchMedia(DARK).matches ? 'dark' : 'light';
}

let pref: ThemePref = readPref();
const listeners = new Set<() => void>();

/**
 * Stamps the resolved theme on `<html>`. The boot script in `index.html` sets
 * the same attribute before first paint, so the app never flashes a light
 * kitchen at someone reading a recipe in a dark one.
 */
function apply() {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;

  // Components carry colour transitions to explain their own state changing.
  // A theme swap changes every colour at once, and animating that reads as a
  // smear across the whole app rather than as an explanation of anything, so
  // it is suppressed for the frame the new tokens land on.
  root.dataset.themeSwitching = 'true';
  root.dataset.theme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[resolved]);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => delete root.dataset.themeSwitching);
  });
}

export function setThemePref(next: ThemePref) {
  pref = next;
  try {
    // "system" is the absence of a stored preference, not a third value.
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    // Failing to persist is survivable. Failing to apply is not.
  }
  apply();
  for (const listener of listeners) listener();
}

// While the choice is "system", follow the device as it changes, live.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia(DARK).addEventListener('change', () => {
    if (pref !== 'system') return;
    apply();
    for (const listener of listeners) listener();
  });
}

export function useTheme() {
  const current = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => pref,
    () => 'system' as ThemePref,
  );
  return { pref: current, setPref: setThemePref };
}
