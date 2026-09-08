import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {spacing, useThemedStyles} from '../theme';

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Bottom-right floating action button. */
export function FabButton({
  onPress,
  accessibilityLabel = 'Add',
  style,
}: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const styles = useThemedStyles(({colors}) =>
    StyleSheet.create({
      fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.28,
        shadowRadius: 8,
        zIndex: 30,
      },
      hit: {
        ...StyleSheet.absoluteFill,
        alignItems: 'center',
        justifyContent: 'center',
      },
      plus: {
        color: colors.onAccent,
        fontSize: 30,
        fontWeight: '300',
        marginTop: -2,
        lineHeight: 34,
      },
    }),
  );

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={[styles.fab, {transform: [{scale}]}, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({pressed}) => [
          styles.hit,
          {opacity: pressed ? 0.88 : 1, transform: [{scale: pressed ? 0.94 : 1}]},
        ]}>
        <Text style={styles.plus}>+</Text>
      </Pressable>
    </Animated.View>
  );
}
