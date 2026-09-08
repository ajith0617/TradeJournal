import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {spacing, useThemedStyles} from '../theme';

interface Props {
  label: string;
  required?: boolean;
}

/** Field label with optional red asterisk for required fields. */
export function FieldLabel({label, required}: Props) {
  const styles = useThemedStyles(({colors, typography}) =>
    StyleSheet.create({
      label: {
        ...typography.label,
        marginBottom: spacing.sm,
      },
      star: {
        color: colors.loss,
        fontWeight: '700',
      },
    }),
  );

  return (
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.star}> *</Text> : null}
    </Text>
  );
}
