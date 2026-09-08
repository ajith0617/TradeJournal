import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemedStyles} from '../theme';

type Edge = 'top' | 'bottom' | 'left' | 'right';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Which edges to pad. Tab screens usually omit bottom (tab bar handles it). */
  edges?: Edge[];
};

/**
 * Consistent safe-area padding so content never sits under status / nav bars
 * (needed with Android edge-to-edge).
 */
export function SafeScreen({
  children,
  style,
  edges = ['top', 'left', 'right'],
}: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(({colors}) =>
    StyleSheet.create({
      base: {
        flex: 1,
        backgroundColor: colors.bg,
      },
    }),
  );

  return (
    <View
      style={[
        styles.base,
        edges.includes('top') && {paddingTop: insets.top},
        edges.includes('bottom') && {paddingBottom: insets.bottom},
        edges.includes('left') && {paddingLeft: insets.left},
        edges.includes('right') && {paddingRight: insets.right},
        style,
      ]}>
      {children}
    </View>
  );
}
