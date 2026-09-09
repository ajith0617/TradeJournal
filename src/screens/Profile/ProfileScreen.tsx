import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {SafeScreen} from '../../components/SafeScreen';
import {Button} from '../../components/Button';
import {Input} from '../../components/Input';
import {FadeSlideIn} from '../../components/FadeSlideIn';
import {ScalePop} from '../../components/ScalePop';
import {useConfirm} from '../../components/ConfirmProvider';
import {useJournalStore} from '../../store/journalStore';
import {
  validatePasswordChange,
  validateUsernameChange,
} from '../../services/auth';
import {
  describeBackupLocation,
  writeFolderBackup,
} from '../../services/folderBackup';
import {
  THEME_OPTIONS,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type ThemeId,
} from '../../theme';
import {motion} from '../../animation/tokens';

const APP_VERSION = require('../../../package.json').version as string;

export function ProfileScreen() {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const {confirm, notice} = useConfirm();
  const styles = useThemedStyles(({colors: c, typography}) =>
    StyleSheet.create({
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
      },
      back: {
        ...typography.body,
        color: c.accent,
        width: 56,
      },
      title: {
        ...typography.subtitle,
      },
      content: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxxl,
      },
      card: {
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        padding: spacing.xl,
        marginBottom: spacing.xl,
      },
      cardTitle: {
        ...typography.subtitle,
      },
      meta: {
        ...typography.bodyMuted,
        marginTop: spacing.xs,
      },
      collapseBlock: {
        backgroundColor: c.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        marginBottom: spacing.md,
        overflow: 'hidden',
      },
      collapseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      },
      collapseTitle: {
        ...typography.subtitle,
        fontSize: 15,
      },
      collapseChevron: {
        ...typography.body,
        color: c.textMuted,
        fontSize: 16,
      },
      collapseBody: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.borderSubtle,
        paddingTop: spacing.md,
      },
      help: {
        ...typography.bodyMuted,
        marginBottom: spacing.md,
        lineHeight: 20,
      },
      switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        marginBottom: spacing.lg,
      },
      switchCopy: {
        flex: 1,
        paddingRight: spacing.md,
      },
      switchTitle: {
        ...typography.subtitle,
        fontSize: 15,
      },
      switchHelp: {
        ...typography.caption,
        marginTop: spacing.xs,
      },
      backupBlock: {
        marginBottom: spacing.sm,
      },
      backupTitle: {
        ...typography.subtitle,
        fontSize: 15,
        marginBottom: spacing.xs,
      },
      credentialBlock: {
        marginBottom: spacing.xl,
      },
      credentialTitle: {
        ...typography.subtitle,
        fontSize: 15,
        marginBottom: spacing.md,
      },
      credentialBlockLast: {
        marginBottom: spacing.sm,
      },
      themeGrid: {
        gap: spacing.sm,
      },
      themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surfaceElevated,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
      },
      themeOptionActive: {
        borderColor: c.accent,
        backgroundColor: c.accentMuted,
      },
      themeSwatches: {
        flexDirection: 'row',
        marginRight: spacing.md,
      },
      themeSwatch: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: c.border,
        marginRight: -6,
      },
      themeCopy: {
        flex: 1,
      },
      themeLabel: {
        ...typography.subtitle,
        fontSize: 15,
      },
      themeDesc: {
        ...typography.caption,
        marginTop: 2,
      },
      themeCheck: {
        ...typography.subtitle,
        color: c.accent,
        fontSize: 16,
        marginLeft: spacing.sm,
      },
      fieldError: {
        ...typography.caption,
        color: c.loss,
        marginBottom: spacing.md,
        marginTop: -spacing.sm,
      },
      readOnlyInput: {
        color: c.textMuted,
        backgroundColor: c.surface,
      },
      footer: {
        ...typography.caption,
        textAlign: 'center',
        marginTop: spacing.xxxl,
        color: c.textDim,
      },
    }),
  );

  const profile = useJournalStore(s => s.profile);
  const setProfile = useJournalStore(s => s.setProfile);
  const setAppUnlocked = useJournalStore(s => s.setAppUnlocked);
  const logout = useJournalStore(s => s.logout);
  const [busy, setBusy] = useState(false);

  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [securityBackupOpen, setSecurityBackupOpen] = useState(false);

  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fingerprintEnabled = profile.fingerprintLockEnabled !== false;
  const activeThemeId = (profile.themeId || 'dark') as ThemeId;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(motion.distance.sm)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: motion.duration.enter,
        easing: motion.easing.soft,
        useNativeDriver: true,
      }),
      Animated.timing(titleY, {
        toValue: 0,
        duration: motion.duration.enter,
        easing: motion.easing.emphasize,
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleOpacity, titleY]);

  const canChangeUsername = useMemo(
    () => username.trim().length > 0,
    [username],
  );

  const canChangePassword = useMemo(
    () =>
      currentPassword.length > 0 &&
      newPassword.length > 0 &&
      confirmPassword.length > 0,
    [currentPassword, newPassword, confirmPassword],
  );

  const onChangeUsername = () => {
    setUsernameError('');
    const err = validateUsernameChange(username, profile.username);
    if (err) {
      setUsernameError(err);
      return;
    }
    const next = username.trim().toLowerCase();
    setProfile({
      username: next,
      email: `${next}@local`,
    });
    setUsername('');
    void notice({
      title: 'Username updated',
      message: 'Use the new username next time you log in.',
      tone: 'success',
    });
  };

  const onChangePassword = () => {
    setPasswordError('');
    const err = validatePasswordChange(
      currentPassword,
      newPassword,
      confirmPassword,
      profile.password,
    );
    if (err) {
      setPasswordError(err);
      return;
    }
    setProfile({password: newPassword});
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    void notice({
      title: 'Password updated',
      message: 'Use the new password next time you log in.',
      tone: 'success',
    });
  };

  const onToggleFingerprint = (enabled: boolean) => {
    setProfile({fingerprintLockEnabled: enabled});
    if (!enabled) {
      setAppUnlocked(true);
    }
  };

  const onSelectTheme = (themeId: ThemeId) => {
    setProfile({themeId});
  };

  const onFolderBackup = async () => {
    setBusy(true);
    try {
      const state = useJournalStore.getState();
      const payload = {
        trades: state.trades,
        rules: state.rules,
        strategies: state.strategies,
        ruleChecks: state.ruleChecks,
        profile: state.profile,
        lastSyncedAt: state.lastSyncedAt,
      };
      await writeFolderBackup(payload);
      await notice({
        title: 'Backup saved',
        message: `Saved to ${describeBackupLocation()}journal-data.json`,
        tone: 'success',
      });
    } catch (e) {
      await notice({
        title: 'Backup failed',
        message:
          e instanceof Error
            ? e.message
            : 'Allow All files access and try again.',
        tone: 'danger',
        confirmLabel: 'OK',
      });
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    const ok = await confirm({
      title: 'Log out',
      message: 'You will need to sign in again.',
      confirmLabel: 'Log out',
      tone: 'danger',
    });
    if (ok) {
      logout();
    }
  };

  return (
    <SafeScreen keyboardAvoiding>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{translateY: titleY}],
          }}>
          <Text style={styles.title}>Profile</Text>
        </Animated.View>
        <View style={{width: 56}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <FadeSlideIn delay={40}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {profile.displayName || profile.username || 'Signed in'}
            </Text>
            <Text style={styles.meta}>
              @{profile.username || 'ajith'} · Local account
            </Text>
          </View>
        </FadeSlideIn>

        <FadeSlideIn delay={90}>
          <View style={styles.collapseBlock}>
            <Pressable
              onPress={() => setCredentialsOpen(v => !v)}
              style={styles.collapseHeader}>
              <Text style={styles.collapseTitle}>Username & password</Text>
              <Text style={styles.collapseChevron}>
                {credentialsOpen ? '▾' : '▸'}
              </Text>
            </Pressable>
            {credentialsOpen ? (
              <FadeSlideIn trigger="credentials">
                <View style={styles.collapseBody}>
                  <View style={styles.credentialBlock}>
                    <Text style={styles.credentialTitle}>Change username</Text>
                    <Input
                      label="Current username"
                      value={profile.username || 'ajith'}
                      editable={false}
                      style={styles.readOnlyInput}
                    />
                    <Input
                      label="New username"
                      required
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="New username"
                    />
                    {usernameError ? (
                      <Text style={styles.fieldError}>{usernameError}</Text>
                    ) : null}
                    <Button
                      title="Update username"
                      onPress={onChangeUsername}
                      disabled={!canChangeUsername}
                    />
                  </View>

                  <View
                    style={[
                      styles.credentialBlock,
                      styles.credentialBlockLast,
                    ]}>
                    <Text style={styles.credentialTitle}>Change password</Text>
                    <Input
                      label="Current password"
                      required
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      showVisibilityToggle
                      placeholder="Current password"
                    />
                    <Input
                      label="New password"
                      required
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      showVisibilityToggle
                      placeholder="New password"
                    />
                    <Input
                      label="Confirm new password"
                      required
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      showVisibilityToggle
                      placeholder="Confirm new password"
                    />
                    {passwordError ? (
                      <Text style={styles.fieldError}>{passwordError}</Text>
                    ) : null}
                    <Button
                      title="Update password"
                      onPress={onChangePassword}
                      disabled={!canChangePassword}
                    />
                  </View>
                </View>
              </FadeSlideIn>
            ) : null}
          </View>
        </FadeSlideIn>

        <FadeSlideIn delay={140}>
          <View style={styles.collapseBlock}>
            <Pressable
              onPress={() => setAppearanceOpen(v => !v)}
              style={styles.collapseHeader}>
              <Text style={styles.collapseTitle}>Appearance</Text>
              <Text style={styles.collapseChevron}>
                {appearanceOpen ? '▾' : '▸'}
              </Text>
            </Pressable>
            {appearanceOpen ? (
              <FadeSlideIn trigger="appearance">
                <View style={styles.collapseBody}>
                  <View style={styles.themeGrid}>
                    {THEME_OPTIONS.map(option => {
                      const selected = activeThemeId === option.id;
                      const swatch = option.colors;
                      return (
                        <ScalePop
                          key={option.id}
                          trigger={selected ? option.id : `idle-${option.id}`}>
                          <Pressable
                            onPress={() => onSelectTheme(option.id)}
                            style={[
                              styles.themeOption,
                              selected && styles.themeOptionActive,
                            ]}>
                            <View style={styles.themeSwatches}>
                              <View
                                style={[
                                  styles.themeSwatch,
                                  {backgroundColor: swatch.bg},
                                ]}
                              />
                              <View
                                style={[
                                  styles.themeSwatch,
                                  {backgroundColor: swatch.surface},
                                ]}
                              />
                              <View
                                style={[
                                  styles.themeSwatch,
                                  {backgroundColor: swatch.accent},
                                ]}
                              />
                            </View>
                            <View style={styles.themeCopy}>
                              <Text style={styles.themeLabel}>
                                {option.label}
                              </Text>
                              <Text style={styles.themeDesc}>
                                {option.description}
                              </Text>
                            </View>
                            {selected ? (
                              <Text style={styles.themeCheck}>✓</Text>
                            ) : null}
                          </Pressable>
                        </ScalePop>
                      );
                    })}
                  </View>
                </View>
              </FadeSlideIn>
            ) : null}
          </View>
        </FadeSlideIn>

        <FadeSlideIn delay={190}>
          <View style={styles.collapseBlock}>
            <Pressable
              onPress={() => setSecurityBackupOpen(v => !v)}
              style={styles.collapseHeader}>
              <Text style={styles.collapseTitle}>Security & backup</Text>
              <Text style={styles.collapseChevron}>
                {securityBackupOpen ? '▾' : '▸'}
              </Text>
            </Pressable>
            {securityBackupOpen ? (
              <FadeSlideIn trigger="security">
                <View style={styles.collapseBody}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchCopy}>
                      <Text style={styles.switchTitle}>Fingerprint lock</Text>
                      <Text style={styles.switchHelp}>
                        Ask for fingerprint after fully closing the app
                      </Text>
                    </View>
                    <Switch
                      value={fingerprintEnabled}
                      onValueChange={onToggleFingerprint}
                      trackColor={{
                        false: colors.border,
                        true: colors.accentMuted,
                      }}
                      thumbColor={
                        fingerprintEnabled ? colors.accent : colors.textDim
                      }
                    />
                  </View>

                  <View style={styles.backupBlock}>
                    <Text style={styles.backupTitle}>Folder backup</Text>
                    <Text style={styles.help}>
                      Path: {describeBackupLocation()}
                      {'\n'}
                      File: journal-data.json (images in images/)
                    </Text>
                    <Button
                      title={busy ? 'Working…' : 'Backup now'}
                      variant="secondary"
                      onPress={onFolderBackup}
                      disabled={busy}
                    />
                  </View>
                </View>
              </FadeSlideIn>
            ) : null}
          </View>
        </FadeSlideIn>

        <FadeSlideIn delay={240}>
          <Button title="Log out" variant="danger" onPress={onLogout} />
          <Text style={styles.footer}>Version {APP_VERSION}</Text>
        </FadeSlideIn>
      </ScrollView>
    </SafeScreen>
  );
}
