import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  DEFAULT_THEME_ID,
  THEMES,
  resolveThemeId,
  type ColorPalette,
  type ThemeId,
} from './colors';
import {createTypography, type AppTypography} from './typography';
import {radius, spacing} from './spacing';

export type ThemeContextValue = {
  themeId: ThemeId;
  colors: ColorPalette;
  typography: AppTypography;
  spacing: typeof spacing;
  radius: typeof radius;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = {
  themeId?: ThemeId | string | null;
  children: ReactNode;
};

export function ThemeProvider({themeId, children}: Props) {
  const resolved = resolveThemeId(themeId ?? DEFAULT_THEME_ID);
  const value = useMemo<ThemeContextValue>(() => {
    const def = THEMES[resolved];
    return {
      themeId: resolved,
      colors: def.colors,
      typography: createTypography(def.colors),
      spacing,
      radius,
      isDark: def.isDark,
    };
  }, [resolved]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const def = THEMES[DEFAULT_THEME_ID];
    return {
      themeId: DEFAULT_THEME_ID,
      colors: def.colors,
      typography: createTypography(def.colors),
      spacing,
      radius,
      isDark: def.isDark,
    };
  }
  return ctx;
}

/** Build StyleSheet (or style map) from the active theme; recreates when theme changes. */
export function useThemedStyles<T>(
  factory: (theme: ThemeContextValue) => T,
): T {
  const theme = useTheme();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  return useMemo(() => factoryRef.current(theme), [theme]);
}
