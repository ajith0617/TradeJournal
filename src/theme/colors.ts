export type ThemeId = 'light' | 'ocean';

export type ColorPalette = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  text: string;
  textMuted: string;
  textDim: string;
  accent: string;
  accentMuted: string;
  profit: string;
  loss: string;
  lossMuted: string;
  warning: string;
  white: string;
  overlay: string;
  /** Text / icon color on accent-filled controls */
  onAccent: string;
};

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  description: string;
  isDark: boolean;
  colors: ColorPalette;
};

/** Bright surfaces + ocean cyan accent */
const lightColors: ColorPalette = {
  bg: '#F3F5F8',
  surface: '#FFFFFF',
  surfaceElevated: '#EAEFF4',
  border: '#CDD5E0',
  borderSubtle: '#E2E7EE',
  text: '#12161C',
  textMuted: '#5C6675',
  textDim: '#8B95A5',
  accent: '#0284C7',
  accentMuted: 'rgba(2, 132, 199, 0.12)',
  profit: '#0D9488',
  loss: '#D93838',
  lossMuted: 'rgba(217, 56, 56, 0.12)',
  warning: '#C4841D',
  white: '#FFFFFF',
  overlay: 'rgba(18, 22, 28, 0.45)',
  onAccent: '#FFFFFF',
};

/**
 * Soft navy dusk + cyan — lighter surfaces (closer to old Slate brightness),
 * not near-black.
 */
const oceanColors: ColorPalette = {
  bg: '#172536',
  surface: '#213348',
  surfaceElevated: '#2B415A',
  border: '#3A536F',
  borderSubtle: '#2E455C',
  text: '#EEF3F9',
  textMuted: '#9AADC3',
  textDim: '#6B8098',
  accent: '#38BDF8',
  accentMuted: 'rgba(56, 189, 248, 0.16)',
  profit: '#34D399',
  loss: '#F87171',
  lossMuted: 'rgba(248, 113, 113, 0.14)',
  warning: '#FBBF24',
  white: '#FFFFFF',
  overlay: 'rgba(16, 24, 36, 0.55)',
  onAccent: '#041018',
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  light: {
    id: 'light',
    label: 'Light',
    description: 'Bright surfaces, ocean cyan accent',
    isDark: false,
    colors: lightColors,
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    description: 'Soft navy dusk with cyan',
    isDark: true,
    colors: oceanColors,
  },
};

export const THEME_OPTIONS: ThemeDefinition[] = [THEMES.light, THEMES.ocean];

export const DEFAULT_THEME_ID: ThemeId = 'ocean';

export function isThemeId(value: unknown): value is ThemeId {
  return value === 'light' || value === 'ocean';
}

/** Maps legacy `dark` / `slate` → `ocean`; unknown → default */
export function resolveThemeId(value: unknown): ThemeId {
  if (value === 'dark' || value === 'slate') {
    return 'ocean';
  }
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}
