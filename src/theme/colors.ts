export type ThemeId = 'dark' | 'light' | 'ocean' | 'slate';

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

/** Current default — charcoal + mint */
const darkColors: ColorPalette = {
  bg: '#0A0C0F',
  surface: '#12161C',
  surfaceElevated: '#1A2029',
  border: '#2A323E',
  borderSubtle: '#1F2630',
  text: '#E8ECF1',
  textMuted: '#8B95A5',
  textDim: '#5C6675',
  accent: '#3DDC97',
  accentMuted: 'rgba(61, 220, 151, 0.14)',
  profit: '#3DDC97',
  loss: '#FF6B6B',
  lossMuted: 'rgba(255, 107, 107, 0.14)',
  warning: '#F0B429',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.55)',
  onAccent: '#04120C',
};

const lightColors: ColorPalette = {
  bg: '#F3F5F8',
  surface: '#FFFFFF',
  surfaceElevated: '#EAEFF4',
  border: '#CDD5E0',
  borderSubtle: '#E2E7EE',
  text: '#12161C',
  textMuted: '#5C6675',
  textDim: '#8B95A5',
  accent: '#0B9B6A',
  accentMuted: 'rgba(11, 155, 106, 0.12)',
  profit: '#0B9B6A',
  loss: '#D93838',
  lossMuted: 'rgba(217, 56, 56, 0.12)',
  warning: '#C4841D',
  white: '#FFFFFF',
  overlay: 'rgba(18, 22, 28, 0.45)',
  onAccent: '#FFFFFF',
};

/** Deep navy + cyan */
const oceanColors: ColorPalette = {
  bg: '#08111F',
  surface: '#101B2E',
  surfaceElevated: '#18263D',
  border: '#2A3D5C',
  borderSubtle: '#1C2B44',
  text: '#E6EEF8',
  textMuted: '#8FA3C0',
  textDim: '#5E7394',
  accent: '#38BDF8',
  accentMuted: 'rgba(56, 189, 248, 0.16)',
  profit: '#34D399',
  loss: '#F87171',
  lossMuted: 'rgba(248, 113, 113, 0.14)',
  warning: '#FBBF24',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.55)',
  onAccent: '#041018',
};

/** Cool gray + soft blue */
const slateColors: ColorPalette = {
  bg: '#101216',
  surface: '#181B22',
  surfaceElevated: '#22262F',
  border: '#343A46',
  borderSubtle: '#272B34',
  text: '#E9ECF2',
  textMuted: '#9299A8',
  textDim: '#636B7A',
  accent: '#7C9CFF',
  accentMuted: 'rgba(124, 156, 255, 0.16)',
  profit: '#4ADE80',
  loss: '#FB7185',
  lossMuted: 'rgba(251, 113, 133, 0.14)',
  warning: '#FBBF24',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.55)',
  onAccent: '#0A0C12',
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  dark: {
    id: 'dark',
    label: 'Dark',
    description: 'Charcoal with mint accent',
    isDark: true,
    colors: darkColors,
  },
  light: {
    id: 'light',
    label: 'Light',
    description: 'Bright surfaces, green accent',
    isDark: false,
    colors: lightColors,
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep navy with cyan',
    isDark: true,
    colors: oceanColors,
  },
  slate: {
    id: 'slate',
    label: 'Slate',
    description: 'Cool gray with blue',
    isDark: true,
    colors: slateColors,
  },
};

export const THEME_OPTIONS: ThemeDefinition[] = [
  THEMES.dark,
  THEMES.light,
  THEMES.ocean,
  THEMES.slate,
];

export const DEFAULT_THEME_ID: ThemeId = 'dark';

export function isThemeId(value: unknown): value is ThemeId {
  return (
    value === 'dark' ||
    value === 'light' ||
    value === 'ocean' ||
    value === 'slate'
  );
}

export function resolveThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}
