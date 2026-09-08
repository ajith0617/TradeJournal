import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {spacing, useThemedStyles} from '../theme';
import {motion} from '../animation/tokens';
import {DynamicDescription} from './DynamicDescription';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Optional accent for contextual subtitle (e.g. wins/losses) */
  subtitleColor?: string;
  /** Stronger animated description (rotating quotes) */
  emphasizeSubtitle?: boolean;
}

/** Header with title entrance + focusable dynamic subtitle. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  subtitleColor,
  emphasizeSubtitle = false,
}: Props) {
  const styles = useThemedStyles(({typography}) =>
    StyleSheet.create({
      wrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
      },
      left: {
        flex: 1,
        paddingRight: spacing.md,
      },
      title: {
        ...typography.title,
      },
    }),
  );

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(motion.distance.sm)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: motion.duration.enter,
        easing: motion.easing.soft,
        useNativeDriver: true,
      }),
      Animated.timing(titleY, {
        toValue: 0,
        duration: motion.duration.enter,
        easing: motion.easing.emphasize,
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleOpacity, titleY]);

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{translateY: titleY}],
          }}>
          <Text style={styles.title}>{title}</Text>
        </Animated.View>
        {subtitle ? (
          <DynamicDescription
            text={subtitle}
            color={subtitleColor}
            emphasize={emphasizeSubtitle}
          />
        ) : null}
      </View>
      {right}
    </View>
  );
}
