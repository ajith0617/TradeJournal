import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {radius, spacing, useTheme, useThemedStyles} from '../theme';
import {motion} from '../animation/tokens';

type Props = {
  text: string;
  /** Accent color for rail + text emphasis */
  color?: string;
  /** Slightly stronger presence (rotating quotes / primary context) */
  emphasize?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Focusable dynamic description with accent rail + polished enter animation.
 * Used under titles and as contextual lines across screens.
 */
export function DynamicDescription({
  text,
  color,
  emphasize = false,
  style,
}: Props) {
  const {colors} = useTheme();
  const accent = color ?? colors.accent;

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const translateX = useRef(new Animated.Value(8)).current;
  const railScale = useRef(new Animated.Value(0.35)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  const styles = useThemedStyles(({typography}) =>
    StyleSheet.create({
      row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: spacing.sm,
        gap: spacing.sm,
      },
      rail: {
        width: 3,
        borderRadius: radius.sm,
        marginTop: 3,
        alignSelf: 'stretch',
        minHeight: emphasize ? 34 : 28,
      },
      copy: {
        flex: 1,
        paddingRight: spacing.xs,
      },
      text: {
        ...typography.bodyMuted,
        fontSize: emphasize ? 15 : 14,
        lineHeight: emphasize ? 22 : 20,
        fontWeight: emphasize ? '600' : '500',
        letterSpacing: 0.15,
      },
    }),
  );

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(10);
    translateX.setValue(12);
    railScale.setValue(0.35);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.duration.slow,
          easing: motion.easing.soft,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: motion.duration.slow,
          easing: motion.easing.emphasize,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: motion.duration.slow,
          easing: motion.easing.emphasize,
          useNativeDriver: true,
        }),
        Animated.spring(railScale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [text, color, opacity, translateX, translateY, railScale]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1600,
          easing: motion.easing.soft,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1600,
          easing: motion.easing.soft,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, text]);

  const railOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });
  const textOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: emphasize ? [0.88, 1] : [0.92, 1],
  });

  return (
    <Animated.View
      style={[
        styles.row,
        style,
        {
          opacity,
          transform: [{translateY}, {translateX}],
        },
      ]}>
      <Animated.View
        style={[
          styles.rail,
          {
            backgroundColor: accent,
            opacity: railOpacity,
            transform: [{scaleY: railScale}],
          },
        ]}
      />
      <View style={styles.copy}>
        <Animated.Text
          style={[styles.text, {color: accent, opacity: textOpacity}]}>
          {text}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}
