import React, {useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button} from '../../components/Button';
import {Input} from '../../components/Input';
import {useJournalStore} from '../../store/journalStore';
import {
  buildSignedInProfile,
  verifyLocalCredentials,
} from '../../services/auth';
import {radius, spacing, useThemedStyles} from '../../theme';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(({colors, typography}) =>
    StyleSheet.create({
      screen: {
        flex: 1,
        backgroundColor: colors.bg,
      },
      inner: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxxl,
        justifyContent: 'center',
      },
      brand: {
        ...typography.title,
        fontSize: 36,
        color: colors.accent,
        textAlign: 'center',
      },
      tagline: {
        ...typography.bodyMuted,
        textAlign: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xxl,
      },
      form: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: spacing.xl,
      },
      error: {
        ...typography.caption,
        color: colors.loss,
        marginBottom: spacing.md,
        marginTop: -spacing.sm,
      },
      loginBtn: {
        marginTop: spacing.sm,
      },
      hint: {
        ...typography.caption,
        color: colors.textDim,
        textAlign: 'center',
        marginTop: spacing.xl,
        paddingHorizontal: spacing.md,
      },
    }),
  );
  const profile = useJournalStore(s => s.profile);
  const loginSuccess = useJournalStore(s => s.loginSuccess);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const canSubmit = useMemo(
    () => username.trim().length > 0 && password.length > 0,
    [username, password],
  );

  const onLocalLogin = () => {
    setError('');
    try {
      const ok = verifyLocalCredentials(
        username,
        password,
        profile.username,
        profile.password,
      );
      if (!ok) {
        setError('Invalid username or password');
        return;
      }
      loginSuccess(buildSignedInProfile(profile, username));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.brand}>Journal</Text>
        <Text style={styles.tagline}>Sign in to continue</Text>

        <View style={styles.form}>
          <Input
            label="Username"
            required
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Username"
          />
          <Input
            label="Password"
            required
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Login"
            onPress={onLocalLogin}
            disabled={!canSubmit}
            style={styles.loginBtn}
          />
        </View>

        <Text style={styles.hint}>
          If fingerprint lock is enabled in Profile, it is required when you
          fully close and reopen the app. You can also unlock with password.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
