import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing, useThemedStyles} from '../theme';
import {Button} from './Button';

interface Props {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({title, message, actionLabel, onAction}: Props) {
  const styles = useThemedStyles(({typography}) =>
    StyleSheet.create({
      wrap: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xxxl,
        alignItems: 'center',
      },
      title: {
        ...typography.subtitle,
        marginBottom: spacing.sm,
        textAlign: 'center',
      },
      message: {
        ...typography.bodyMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
      },
      btn: {
        minWidth: 160,
      },
    }),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          style={styles.btn}
        />
      ) : null}
    </View>
  );
}
