import { Icon } from './Icon';
import { useTheme, type ThemePref } from '../lib/theme';

const OPTIONS: Array<{
  value: ThemePref;
  label: string;
  icon: 'display' | 'sun' | 'moon';
}> = [
  { value: 'system', label: 'Match device', icon: 'display' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

/**
 * Real radio inputs behind styled labels, so arrow-key navigation, grouping,
 * and checked state come from the browser rather than from hand-rolled ARIA.
 */
export function ThemeToggle() {
  const { pref, setPref } = useTheme();

  return (
    <fieldset className="theme-toggle">
      <legend className="visually-hidden">Appearance</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.value}
          className="theme-option"
          title={option.label}
          data-checked={pref === option.value}
        >
          <input
            type="radio"
            name="forkast-theme"
            value={option.value}
            checked={pref === option.value}
            onChange={() => setPref(option.value)}
          />
          <Icon name={option.icon} />
          <span className="visually-hidden">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
