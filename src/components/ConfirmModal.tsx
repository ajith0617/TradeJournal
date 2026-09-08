import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button} from './Button';
import {radius, spacing, useTheme, useThemedStyles} from '../theme';
import {motion} from '../animation/tokens';

export type ConfirmTone = 'danger' | 'accent' | 'success' | 'warning';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Hide cancel — single-button notice */
  dismissOnly?: boolean;
  tone?: ConfirmTone;
};

type Props = ConfirmOptions & {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function toneAccent(
  tone: ConfirmTone,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  switch (tone) {
    case 'danger':
      return colors.loss;
    case 'success':
      return colors.profit;
    case 'warning':
      return colors.warning;
    default:
      return colors.accent;
  }
}

function toneMuted(
  tone: ConfirmTone,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  switch (tone) {
    case 'danger':
      return colors.lossMuted;
    case 'success':
      return 'rgba(61, 220, 151, 0.14)';
    case 'warning':
      return 'rgba(240, 180, 41, 0.14)';
    default:
      return colors.accentMuted;
  }
}

/** Themed confirmation / notice sheet used across the app. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  dismissOnly = false,
  tone = 'accent',
  onConfirm,
  onCancel,
}: Props) {
  const {colors} = useTheme();
  const accent = toneAccent(tone, colors);
  const muted = toneMuted(tone, colors);
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const styles = useThemedStyles(({colors: c, typography}) =>
    StyleSheet.create({
      root: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
      },
      backdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: c.overlay,
      },
      card: {
        backgroundColor: c.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        paddingTop: spacing.xl + 4,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
        overflow: 'hidden',
      },
      accentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
      },
      iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
      },
      icon: {
        fontSize: 18,
        fontWeight: '700',
      },
      title: {
        ...typography.subtitle,
        fontSize: 18,
        marginBottom: spacing.sm,
      },
      message: {
        ...typography.bodyMuted,
        lineHeight: 22,
        marginBottom: spacing.xl,
      },
      spacer: {
        marginBottom: spacing.xl,
      },
      actions: {
        flexDirection: 'row',
        gap: spacing.sm,
      },
      actionFlex: {
        flex: 1,
      },
    }),
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    scale.setValue(0.94);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.fast,
        easing: motion.easing.soft,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, scale]);

  const iconGlyph =
    tone === 'danger'
      ? '!'
      : tone === 'success'
        ? '✓'
        : tone === 'warning'
          ? '!'
          : 'i';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <Animated.View style={{opacity, transform: [{scale}]}}>
          <View style={styles.card}>
            <View style={[styles.accentBar, {backgroundColor: accent}]} />
            <View style={[styles.iconWrap, {backgroundColor: muted}]}>
              <Text style={[styles.icon, {color: accent}]}>{iconGlyph}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            {message ? (
              <Text style={styles.message}>{message}</Text>
            ) : (
              <View style={styles.spacer} />
            )}
            <View style={styles.actions}>
              {!dismissOnly ? (
                <Button
                  title={cancelLabel}
                  variant="secondary"
                  onPress={onCancel}
                  style={styles.actionFlex}
                />
              ) : null}
              <Button
                title={confirmLabel}
                variant={tone === 'danger' ? 'danger' : 'primary'}
                onPress={onConfirm}
                style={styles.actionFlex}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
