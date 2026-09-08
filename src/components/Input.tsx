import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import {radius, spacing, useTheme, useThemedStyles} from '../theme';
import {FieldLabel} from './FieldLabel';

interface Props extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
}

export function Input({label, required, error, style, ...rest}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(({colors: c, typography}) =>
    StyleSheet.create({
      wrap: {
        marginBottom: spacing.lg,
      },
      input: {
        backgroundColor: c.surfaceElevated,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        color: c.text,
        fontSize: 15,
      },
      error: {
        ...typography.caption,
        color: c.loss,
        marginTop: spacing.xs,
      },
    }),
  );

  return (
    <View style={styles.wrap}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.input, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
