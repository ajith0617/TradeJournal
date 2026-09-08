import React, {useCallback, useEffect, useRef, useState} from 'react';
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
  checkBiometrics,
  promptFingerprint,
} from '../../services/biometrics';
import {verifyLocalCredentials} from '../../services/auth';
import {radius, spacing, useThemedStyles} from '../../theme';

export function BiometricLockScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(({colors, typography}) =>
    StyleSheet.create({
      screen: {
        flex: 1,
        backgroundColor: colors.bg,
        paddingHorizontal: spacing.lg,
      },
      brand: {
        ...typography.title,
        fontSize: 32,
        color: colors.accent,
        textAlign: 'center',
        marginBottom: spacing.md,
      },
      title: {
        ...typography.subtitle,
        fontSize: 20,
        textAlign: 'center',
        marginBottom: spacing.xs,
      },
      hint: {
        ...typography.bodyMuted,
        textAlign: 'center',
        marginBottom: spacing.lg,
      },
      error: {
        ...typography.caption,
        color: colors.loss,
        textAlign: 'center',
        marginBottom: spacing.md,
      },
      btn: {
        marginBottom: spacing.md,
      },
      dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
        gap: spacing.md,
      },
      dividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
      },
      dividerText: {
        ...typography.caption,
        color: colors.textMuted,
      },
      form: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: spacing.xl,
      },
      logout: {
        marginTop: spacing.xl,
      },
    }),
  );
  const profile = useJournalStore(s => s.profile);
  const setAppUnlocked = useJournalStore(s => s.setAppUnlocked);
  const logout = useJournalStore(s => s.logout);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState(profile.username || 'ajith');
  const [password, setPassword] = useState('');
  const autoPrompted = useRef(false);

  const unlockWithFingerprint = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await promptFingerprint();
      if (result.success) {
        setAppUnlocked(true);
        return;
      }
      setError(result.error || 'Fingerprint canceled — use password below');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Fingerprint failed — use password',
      );
    } finally {
      setBusy(false);
    }
  }, [setAppUnlocked]);

  const unlockWithPassword = () => {
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
      setAppUnlocked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  useEffect(() => {
    if (autoPrompted.current) {
      return;
    }
    autoPrompted.current = true;
    let cancelled = false;
    (async () => {
      try {
        const status = await checkBiometrics();
        if (cancelled) {
          return;
        }
        if (!status.available) {
          setError(
            status.error ||
              'Fingerprint not available — unlock with password.',
          );
          return;
        }
        await unlockWithFingerprint();
      } catch {
        if (!cancelled) {
          setError('Fingerprint unavailable — unlock with password.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unlockWithFingerprint]);

  const canPasswordUnlock =
    username.trim().length > 0 && password.length > 0 && !busy;

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
      <Text style={styles.brand}>Journal</Text>
      <Text style={styles.title}>Unlock</Text>
      <Text style={styles.hint}>Fingerprint or password</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={busy ? 'Waiting for fingerprint…' : 'Unlock with fingerprint'}
        onPress={unlockWithFingerprint}
        disabled={busy}
        style={styles.btn}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

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
        <Button
          title="Unlock with password"
          onPress={unlockWithPassword}
          disabled={!canPasswordUnlock}
        />
      </View>

      <Button title="Log out" variant="ghost" onPress={logout} style={styles.logout} />
    </KeyboardAvoidingView>
  );
}
