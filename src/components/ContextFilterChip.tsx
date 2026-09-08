import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import {radius, spacing, useTheme, useThemedStyles} from '../theme';
import {motion} from '../animation/tokens';

export type FilterTone = 'neutral' | 'pending' | 'profit' | 'loss';

type Props = {
  label: string;
  active: boolean;
  tone: FilterTone;
  onPress: () => void;
  style?: ViewStyle;
};

function resolveTone(
  tone: FilterTone,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  switch (tone) {
    case 'pending':
      return {
        accent: colors.warning,
        muted: 'rgba(240, 180, 41, 0.14)',
      };
    case 'profit':
      return {accent: colors.profit, muted: 'rgba(61, 220, 151, 0.14)'};
    case 'loss':
      return {accent: colors.loss, muted: colors.lossMuted};
    default:
      return {accent: colors.accent, muted: colors.accentMuted};
  }
}

/** Filter / preset chip with context color + select bounce. */
export function ContextFilterChip({
  label,
  active,
  tone,
  onPress,
  style,
}: Props) {
  const {colors} = useTheme();
  const palette = resolveTone(tone, colors);
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const styles = useThemedStyles(({colors: c, typography}) =>
    StyleSheet.create({
      chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        overflow: 'hidden',
      },
      label: {
        ...typography.caption,
        fontWeight: '600',
        color: c.textMuted,
      },
    }),
  );

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    scale.setValue(0.94);
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 160,
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: motion.easing.soft,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: motion.easing.soft,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse, scale]);

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.2],
  });

  return (
    <Animated.View style={[{transform: [{scale}]}, style]}>
      <Pressable
        onPress={onPress}
        style={[
          styles.chip,
          active && {
            borderColor: palette.accent,
            backgroundColor: palette.muted,
          },
        ]}>
        {active ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {backgroundColor: palette.accent, opacity: glowOpacity},
            ]}
          />
        ) : null}
        <Text style={[styles.label, active && {color: palette.accent}]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
