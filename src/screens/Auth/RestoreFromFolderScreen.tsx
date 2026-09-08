import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button} from '../../components/Button';
import {useJournalStore} from '../../store/journalStore';
import {
  describeBackupLocation,
  hasAllFilesAccess,
  openAllFilesAccessSettings,
  readFolderBackup,
} from '../../services/folderBackup';
import {radius, spacing, useThemedStyles} from '../../theme';

export function RestoreFromFolderScreen() {
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
        marginBottom: spacing.lg,
      },
      title: {
        ...typography.subtitle,
        fontSize: 20,
        textAlign: 'center',
        marginBottom: spacing.md,
      },
      body: {
        ...typography.bodyMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
      },
      path: {
        color: colors.accent,
        fontWeight: '600',
      },
      error: {
        ...typography.caption,
        color: colors.loss,
        textAlign: 'center',
        marginBottom: spacing.md,
      },
      card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: spacing.xl,
      },
      skip: {
        marginTop: spacing.md,
      },
    }),
  );
  const restoreFromFolder = useJournalStore(s => s.restoreFromFolder);
  const dismissRestore = useJournalStore(s => s.dismissRestore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onRestore = async () => {
    setBusy(true);
    setError('');
    try {
      const allowed = await hasAllFilesAccess();
      if (!allowed) {
        setError(
          'Turn on All files access for TradeJournal (not Camera / Photos), then tap Restore again.',
        );
        await openAllFilesAccessSettings();
        return;
      }

      const data = await readFolderBackup();
      await restoreFromFolder(data);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Could not restore from folder.';
      const blocked =
        message.toLowerCase().includes('blocked') ||
        message.toLowerCase().includes('all files') ||
        message.toLowerCase().includes('permission');
      setError(message);
      if (blocked) {
        try {
          await openAllFilesAccessSettings();
        } catch {
          // ignore
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const onSkip = async () => {
    setBusy(true);
    try {
      await dismissRestore();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}>
      <Text style={styles.brand}>Journal</Text>
      <Text style={styles.title}>Restore your data?</Text>
      <Text style={styles.body}>
        A backup was found in{'\n'}
        <Text style={styles.path}>{describeBackupLocation()}</Text>
        {'\n\n'}
        Restore trades, rules, and strategies from that folder? You will still
        need to log in after restoring.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Button
          title={busy ? 'Working…' : 'Restore from Journal folder'}
          onPress={onRestore}
          disabled={busy}
        />
        <Button
          title="Start fresh"
          variant="secondary"
          onPress={onSkip}
          disabled={busy}
          style={styles.skip}
        />
      </View>
    </View>
  );
}
