import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {radius, spacing, useThemedStyles} from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  textStyle,
}: Props) {
  const styles = useThemedStyles(({colors, typography}) =>
    StyleSheet.create({
      base: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
      },
      primary: {
        backgroundColor: colors.accent,
      },
      secondary: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: colors.lossMuted,
      },
      pressed: {
        opacity: 0.85,
      },
      disabled: {
        opacity: 0.4,
      },
      text: {
        ...typography.subtitle,
        fontSize: 15,
      },
      primaryText: {
        color: colors.onAccent,
      },
      secondaryText: {
        color: colors.text,
      },
      ghostText: {
        color: colors.accent,
      },
      dangerText: {
        color: colors.loss,
      },
    }),
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.base,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}
