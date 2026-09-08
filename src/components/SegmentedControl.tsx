import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {radius, spacing, useThemedStyles} from '../theme';
import {FieldLabel} from './FieldLabel';

interface Option<T extends string> {
  label: string;
  value: T;
}

interface Props<T extends string> {
  label?: string;
  required?: boolean;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  required,
  options,
  value,
  onChange,
}: Props<T>) {
  const styles = useThemedStyles(({colors, typography}) =>
    StyleSheet.create({
      wrap: {
        marginBottom: spacing.lg,
      },
      row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
      },
      chip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.sm,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
      },
      chipActive: {
        backgroundColor: colors.accentMuted,
        borderColor: colors.accent,
      },
      chipText: {
        ...typography.caption,
        color: colors.textMuted,
      },
      chipTextActive: {
        color: colors.accent,
      },
    }),
  );

  return (
    <View style={styles.wrap}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <View style={styles.row}>
        {options.map(opt => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
