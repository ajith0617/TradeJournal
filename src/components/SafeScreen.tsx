import React from 'react';
import {
  KeyboardAvoidingView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemedStyles} from '../theme';

type Edge = 'top' | 'bottom' | 'left' | 'right';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Which edges to pad. Tab screens usually omit bottom (tab bar handles it). */
  edges?: Edge[];
  /** Lift form content above the soft keyboard. */
  keyboardAvoiding?: boolean;
  /** Extra offset for headers / status bar when avoiding the keyboard. */
  keyboardVerticalOffset?: number;
};

/**
 * Consistent safe-area padding so content never sits under status / nav bars
 * (needed with Android edge-to-edge).
 */
export function SafeScreen({
  children,
  style,
  edges = ['top', 'left', 'right'],
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
}: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(({colors}) =>
    StyleSheet.create({
      base: {
        flex: 1,
        backgroundColor: colors.bg,
      },
      fill: {
        flex: 1,
      },
    }),
  );

  const edgePadding = [
    edges.includes('top') && {paddingTop: insets.top},
    edges.includes('bottom') && {paddingBottom: insets.bottom},
    edges.includes('left') && {paddingLeft: insets.left},
    edges.includes('right') && {paddingRight: insets.right},
  ];

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={[styles.base, style]}
        behavior="padding"
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled>
        <View style={[styles.fill, ...edgePadding]}>{children}</View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.base, ...edgePadding, style]}>{children}</View>
  );
}
