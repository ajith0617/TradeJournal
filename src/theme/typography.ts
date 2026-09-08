import {TextStyle} from 'react-native';
import type {ColorPalette} from './colors';

export type AppTypography = {
  title: TextStyle;
  subtitle: TextStyle;
  body: TextStyle;
  bodyMuted: TextStyle;
  caption: TextStyle;
  label: TextStyle;
  number: TextStyle;
  numberLarge: TextStyle;
};

export function createTypography(palette: ColorPalette): AppTypography {
  return {
    title: {
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: palette.text,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
    },
    body: {
      fontSize: 15,
      fontWeight: '400',
      lineHeight: 22,
      color: palette.text,
    },
    bodyMuted: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: palette.textMuted,
    },
    caption: {
      fontSize: 12,
      fontWeight: '500',
      letterSpacing: 0.2,
      color: palette.textMuted,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textMuted,
    },
    number: {
      fontSize: 20,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      color: palette.text,
    },
    numberLarge: {
      fontSize: 28,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
      color: palette.text,
    },
  };
}
