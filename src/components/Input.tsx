import React, {useState} from 'react';
import {
  Pressable,
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
  /** Show an eye control to reveal/hide secure text. */
  showVisibilityToggle?: boolean;
}

function EyeIcon({open, color}: {open: boolean; color: string}) {
  return (
    <View style={eyeStyles.wrap} accessibilityElementsHidden>
      <View style={[eyeStyles.outline, {borderColor: color}]}>
        {open ? (
          <View style={[eyeStyles.pupil, {backgroundColor: color}]} />
        ) : (
          <View style={[eyeStyles.slash, {backgroundColor: color}]} />
        )}
      </View>
    </View>
  );
}

const eyeStyles = StyleSheet.create({
  wrap: {
    width: 22,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    width: 20,
    height: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  slash: {
    position: 'absolute',
    width: 22,
    height: 1.5,
    transform: [{rotate: '-28deg'}],
  },
});

export function Input({
  label,
  required,
  error,
  style,
  secureTextEntry,
  showVisibilityToggle,
  ...rest
}: Props) {
  const {colors} = useTheme();
  const [visible, setVisible] = useState(false);
  const styles = useThemedStyles(({colors: c, typography}) =>
    StyleSheet.create({
      wrap: {
        marginBottom: spacing.lg,
      },
      fieldRow: {
        position: 'relative',
        justifyContent: 'center',
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
      inputWithToggle: {
        paddingRight: 48,
      },
      eyeBtn: {
        position: 'absolute',
        right: spacing.xs,
        top: 0,
        bottom: 0,
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
      },
      error: {
        ...typography.caption,
        color: c.loss,
        marginTop: spacing.xs,
      },
    }),
  );

  const useToggle = Boolean(showVisibilityToggle && secureTextEntry);
  const isSecure = useToggle ? !visible : Boolean(secureTextEntry);

  return (
    <View style={styles.wrap}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <View style={styles.fieldRow}>
        <TextInput
          placeholderTextColor={colors.textDim}
          style={[styles.input, useToggle && styles.inputWithToggle, style]}
          secureTextEntry={isSecure}
          {...rest}
        />
        {useToggle ? (
          <Pressable
            onPress={() => setVisible(v => !v)}
            style={styles.eyeBtn}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            hitSlop={8}>
            <EyeIcon
              open={visible}
              color={visible ? colors.accent : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
