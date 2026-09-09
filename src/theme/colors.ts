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

/** Default — graphite surfaces with restrained emerald */
const darkColors: ColorPalette = {
  bg: '#0A0B0D',
  surface: '#13151A',
  surfaceElevated: '#1C1F26',
  border: '#2B303B',
  borderSubtle: '#1F232B',
  text: '#EDEFF2',
  textMuted: '#8E96A3',
  textDim: '#5E6673',
  accent: '#2DB88A',
  accentMuted: 'rgba(45, 184, 138, 0.12)',
  profit: '#2DB88A',
  loss: '#E5484D',
  lossMuted: 'rgba(229, 72, 77, 0.12)',
  warning: '#D4A017',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.58)',
  onAccent: '#04140F',
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

/** Blue-gray dusk + terracotta — not near-black, distinct from Dark/Ocean */
const slateColors: ColorPalette = {
  bg: '#1B2430',
  surface: '#243142',
  surfaceElevated: '#2E3D52',
  border: '#3D4E66',
  borderSubtle: '#314257',
  text: '#EEF2F7',
  textMuted: '#9AABC0',
  textDim: '#6B7F96',
  accent: '#E07A5F',
  accentMuted: 'rgba(224, 122, 95, 0.16)',
  profit: '#4CAF82',
  loss: '#E35D6A',
  lossMuted: 'rgba(227, 93, 106, 0.14)',
  warning: '#E6B422',
  white: '#FFFFFF',
  overlay: 'rgba(16, 22, 32, 0.55)',
  onAccent: '#1A120E',
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  dark: {
    id: 'dark',
    label: 'Dark',
    description: 'Graphite with emerald accent',
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
    description: 'Blue-gray dusk with terracotta',
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
