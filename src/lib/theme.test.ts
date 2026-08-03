import { describe, expect, it, vi } from 'vitest';

/**
 * This jsdom setup exposes `localStorage` as a bare object with no Storage
 * methods, so the cases supply a real one. The app survives its absence — every
 * access in theme.ts is guarded — but these cases are about what gets stored.
 */
function installStorage() {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => entries.clear(),
  };
  vi.stubGlobal('localStorage', storage);
  return storage;
}

/**
 * The module reads storage and subscribes to the media query at import time,
 * so every case installs its world first and then imports a fresh copy.
 */
async function loadTheme(options: { stored?: string; deviceDark?: boolean } = {}) {
  const storage = installStorage();
  if (options.stored) storage.setItem('forkast:theme', options.stored);

  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: Boolean(options.deviceDark),
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        listeners.delete(listener),
    })),
  );

  document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = '<meta name="theme-color" content="#f4f3ee" />';

  vi.resetModules();
  const module = await import('./theme');
  return {
    ...module,
    storage,
    fireDeviceChange: () => listeners.forEach((l) => l()),
  };
}

const stamped = () => document.documentElement.dataset.theme;
const themeColor = () =>
  document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

// `vi.unstubAllGlobals` is deliberately absent: it drops jsdom's localStorage
// along with the stubs. Every case restubs matchMedia through loadTheme.

describe('appearance preference', () => {
  it('follows the device when nothing is stored', async () => {
    const dark = await loadTheme({ deviceDark: true });
    expect(dark.resolveTheme('system')).toBe('dark');

    const light = await loadTheme({ deviceDark: false });
    expect(light.resolveTheme('system')).toBe('light');
  });

  it('stamps the chosen theme and its canvas on the document', async () => {
    const theme = await loadTheme({ deviceDark: false });

    theme.setThemePref('dark');
    expect(stamped()).toBe('dark');
    expect(themeColor()).toBe('#131714');

    theme.setThemePref('light');
    expect(stamped()).toBe('light');
    expect(themeColor()).toBe('#f4f3ee');
  });

  it('stores an explicit choice and treats system as its absence', async () => {
    const theme = await loadTheme({ deviceDark: false });

    theme.setThemePref('dark');
    expect(theme.storage.getItem('forkast:theme')).toBe('dark');

    theme.setThemePref('system');
    expect(theme.storage.getItem('forkast:theme')).toBeNull();
  });

  it('reads a stored choice back on the next visit', async () => {
    const theme = await loadTheme({ stored: 'dark', deviceDark: false });
    expect(theme.resolveTheme('system')).toBe('light');
    theme.setThemePref('system');
    expect(stamped()).toBe('light');

    const again = await loadTheme({ stored: 'dark', deviceDark: false });
    again.setThemePref('dark');
    expect(stamped()).toBe('dark');
  });

  it('ignores a stored value it did not write', async () => {
    const theme = await loadTheme({ stored: 'sepia', deviceDark: true });
    theme.setThemePref(theme.resolveTheme('system'));
    expect(stamped()).toBe('dark');
  });

  it('follows the device live only while the choice is system', async () => {
    const theme = await loadTheme({ deviceDark: false });
    theme.setThemePref('system');
    expect(stamped()).toBe('light');

    // The device flips to dark. "System" has to follow it without a reload.
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    theme.fireDeviceChange();
    expect(stamped()).toBe('dark');

    // A held choice does not.
    theme.setThemePref('light');
    theme.fireDeviceChange();
    expect(stamped()).toBe('light');
  });
});
