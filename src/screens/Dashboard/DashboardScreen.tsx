import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  format,
  parseISO,
  subDays,
  subMonths,
} from 'date-fns';
import {SafeScreen} from '../../components/SafeScreen';
import {ScreenHeader} from '../../components/ScreenHeader';
import {DateField} from '../../components/DateField';
import {FadeSlideIn} from '../../components/FadeSlideIn';
import {ContextFilterChip} from '../../components/ContextFilterChip';
import {PulseGlow, ScalePop} from '../../components/ScalePop';
import {useJournalStore} from '../../store/journalStore';
import {
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type AppTypography,
  type ColorPalette,
} from '../../theme';
import {formatDisplayDate, formatSignedINR} from '../../utils/format';
import {
  computeStats,
  filterTradesByDateRange,
  pnlByStrategy,
} from '../../utils/stats';
import type {DashboardStackParamList} from '../../navigation/types';
import {useRotatingQuote} from '../../hooks/useRotatingQuote';

type RangePreset = 'day' | 'week' | 'month' | '3m' | 'custom';

const PRESETS: {id: Exclude<RangePreset, 'custom'>; label: string}[] = [
  {id: 'day', label: 'Day'},
  {id: 'week', label: 'Week'},
  {id: 'month', label: 'Month'},
  {id: '3m', label: '3 Month'},
];

function rangeForPreset(
  preset: Exclude<RangePreset, 'custom'>,
): {from: string; to: string} {
  const now = new Date();
  const to = format(now, 'yyyy-MM-dd');
  switch (preset) {
    case 'day':
      return {from: to, to};
    case 'week':
      return {from: format(subDays(now, 6), 'yyyy-MM-dd'), to};
    case 'month':
      return {from: format(subMonths(now, 1), 'yyyy-MM-dd'), to};
    case '3m':
      return {from: format(subMonths(now, 3), 'yyyy-MM-dd'), to};
  }
}

function profileInitial(username?: string, displayName?: string): string {
  const source = (username || displayName || 'U').trim();
  return source.charAt(0).toUpperCase() || 'U';
}

export function DashboardScreen() {
  const {colors, typography} = useTheme();
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  const navigation =
    useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const trades = useJournalStore(s => s.trades);
  const strategies = useJournalStore(s => s.strategies);
  const profile = useJournalStore(s => s.profile);

  const initial = rangeForPreset('month');
  const [preset, setPreset] = useState<RangePreset>('month');
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [customOpen, setCustomOpen] = useState(false);

  const applyPreset = (next: Exclude<RangePreset, 'custom'>) => {
    const range = rangeForPreset(next);
    setPreset(next);
    setFromDate(range.from);
    setToDate(range.to);
    setCustomOpen(false);
  };

  const onFromChange = (value: string) => {
    setFromDate(value);
    setPreset('custom');
  };

  const onToChange = (value: string) => {
    setToDate(value);
    setPreset('custom');
  };

  const rangeError = useMemo(() => {
    if (fromDate && toDate && fromDate > toDate) {
      return 'From date cannot be after To date';
    }
    return '';
  }, [fromDate, toDate]);

  const filtered = useMemo(() => {
    if (rangeError) {
      return [];
    }
    return filterTradesByDateRange(trades, fromDate, toDate);
  }, [trades, fromDate, toDate, rangeError]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const byStrategy = useMemo(
    () => pnlByStrategy(filtered, strategies),
    [filtered, strategies],
  );
  const quote = useRotatingQuote();
  const glowColor =
    stats.netPnl > 0
      ? colors.profit
      : stats.netPnl < 0
        ? colors.loss
        : colors.accent;
  const rangeKey = `${fromDate}:${toDate}:${stats.netPnl}:${stats.count}`;

  return (
    <SafeScreen>
      <ScreenHeader
        title="Dashboard"
        subtitle={quote}
        emphasizeSubtitle
        right={
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileBtn}
            accessibilityLabel="Open profile">
            <Text style={styles.profileIcon}>
              {profileInitial(profile.username, profile.displayName)}
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <FadeSlideIn delay={30}>
          <View style={styles.presetRow}>
            {PRESETS.map(item => (
              <ContextFilterChip
                key={item.id}
                label={item.label}
                tone="neutral"
                active={preset === item.id}
                onPress={() => applyPreset(item.id)}
              />
            ))}
          </View>
        </FadeSlideIn>

        <FadeSlideIn delay={60}>
          <Pressable
            onPress={() => setCustomOpen(v => !v)}
            style={styles.customToggle}>
            <Text style={styles.customToggleText}>Custom dates</Text>
            <Text style={styles.customChevron}>{customOpen ? '▾' : '▸'}</Text>
          </Pressable>

          {customOpen ? (
            <View style={styles.rangeRow}>
              <View style={styles.rangeField}>
                <DateField
                  label="From"
                  value={fromDate}
                  onChange={onFromChange}
                  maximumDate={toDate ? parseISO(toDate) : undefined}
                />
              </View>
              <View style={styles.rangeField}>
                <DateField
                  label="To"
                  value={toDate}
                  onChange={onToChange}
                  minimumDate={fromDate ? parseISO(fromDate) : undefined}
                />
              </View>
            </View>
          ) : null}

          {rangeError ? (
            <Text style={styles.rangeError}>{rangeError}</Text>
          ) : (
            <Text style={styles.rangeHint}>
              Showing {formatDisplayDate(fromDate)} →{' '}
              {formatDisplayDate(toDate)}
            </Text>
          )}
        </FadeSlideIn>

        <FadeSlideIn delay={120} trigger={rangeKey}>
          <PulseGlow
            active={stats.count > 0}
            color={glowColor}
            radius={radius.lg}
            style={styles.heroGlow}>
            <ScalePop trigger={rangeKey}>
              <View style={styles.hero}>
                <Text style={styles.heroLabel}>Net P&L</Text>
                <Text
                  style={[
                    styles.heroValue,
                    {
                      color:
                        stats.netPnl >= 0 ? colors.profit : colors.loss,
                    },
                  ]}>
                  {formatSignedINR(stats.netPnl)}
                </Text>
                <Text style={styles.heroSub}>
                  {stats.count} reviewed · {stats.winRate}% win rate
                  {stats.openCount > 0 ? ` · ${stats.openCount} open` : ''}
                </Text>
              </View>
            </ScalePop>
          </PulseGlow>
        </FadeSlideIn>

        <View style={styles.statsRow}>
          <FadeSlideIn delay={160} trigger={rangeKey} style={styles.statFlex}>
            <Stat
              label="Avg win"
              value={formatSignedINR(stats.avgWin)}
              positive
            />
          </FadeSlideIn>
          <FadeSlideIn delay={200} trigger={rangeKey} style={styles.statFlex}>
            <Stat
              label="Avg loss"
              value={formatSignedINR(stats.avgLoss)}
              positive={false}
            />
          </FadeSlideIn>
        </View>
        <View style={styles.statsRow}>
          <FadeSlideIn delay={240} trigger={rangeKey} style={styles.statFlex}>
            <Stat label="Wins" value={String(stats.wins)} positive />
          </FadeSlideIn>
          <FadeSlideIn delay={280} trigger={rangeKey} style={styles.statFlex}>
            <Stat
              label="Losses"
              value={String(stats.losses)}
              positive={false}
            />
          </FadeSlideIn>
        </View>

        <FadeSlideIn delay={320} trigger={rangeKey}>
          <Text style={styles.section}>By strategy</Text>
          {byStrategy.length === 0 ? (
            <Text style={styles.empty}>No trades in this date range.</Text>
          ) : (
            byStrategy.map((row, index) => (
              <FadeSlideIn
                key={row.name}
                delay={Math.min(index, 6) * 40}
                trigger={rangeKey}>
                <View style={styles.strategyRow}>
                  <View>
                    <Text style={styles.strategyName}>{row.name}</Text>
                    <Text style={styles.strategyCount}>
                      {row.count} trades
                    </Text>
                  </View>
                  <Text
                    style={{
                      ...typography.number,
                      fontSize: 15,
                      color: row.pnl >= 0 ? colors.profit : colors.loss,
                    }}>
                    {formatSignedINR(row.pnl)}
                  </Text>
                </View>
              </FadeSlideIn>
            ))
          )}
        </FadeSlideIn>
      </ScrollView>
    </SafeScreen>
  );
}

function Stat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  const color =
    positive === undefined
      ? colors.text
      : positive
        ? colors.profit
        : colors.loss;
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ColorPalette, typography: AppTypography) {
  return StyleSheet.create({
    profileBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileIcon: {
      ...typography.subtitle,
      fontSize: 14,
      color: colors.accent,
      fontWeight: '700',
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    customToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      paddingVertical: spacing.xs,
    },
    customToggleText: {
      ...typography.body,
      color: colors.textMuted,
      fontSize: 14,
    },
    customChevron: {
      ...typography.body,
      color: colors.textMuted,
      fontSize: 14,
    },
    rangeRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    rangeField: {
      flex: 1,
    },
    rangeHint: {
      ...typography.caption,
      marginBottom: spacing.md,
      marginTop: -spacing.sm,
    },
    rangeError: {
      ...typography.caption,
      color: colors.loss,
      marginBottom: spacing.md,
      marginTop: -spacing.sm,
    },
    heroGlow: {
      marginBottom: spacing.lg,
    },
    hero: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: spacing.xl,
    },
    heroLabel: {
      ...typography.label,
    },
    heroValue: {
      ...typography.numberLarge,
      marginVertical: spacing.sm,
    },
    heroSub: {
      ...typography.bodyMuted,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    statFlex: {
      flex: 1,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: spacing.lg,
    },
    statLabel: {
      ...typography.caption,
      marginBottom: spacing.xs,
    },
    statValue: {
      ...typography.subtitle,
    },
    section: {
      ...typography.subtitle,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    empty: {
      ...typography.bodyMuted,
    },
    strategyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    strategyName: {
      ...typography.body,
      fontWeight: '600',
    },
    strategyCount: {
      ...typography.caption,
      marginTop: 2,
    },
  });
}
