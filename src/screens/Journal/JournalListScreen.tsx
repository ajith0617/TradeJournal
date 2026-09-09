import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {format, parseISO} from 'date-fns';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SafeScreen} from '../../components/SafeScreen';
import {ScreenHeader} from '../../components/ScreenHeader';
import {TradeCard} from '../../components/TradeCard';
import {EmptyState} from '../../components/EmptyState';
import {FadeSlideIn} from '../../components/FadeSlideIn';
import {FabButton} from '../../components/FabButton';
import {DateField} from '../../components/DateField';
import {Button} from '../../components/Button';
import {
  ContextFilterChip,
  type FilterTone,
} from '../../components/ContextFilterChip';
import {useJournalStore} from '../../store/journalStore';
import {
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type AppTypography,
  type ColorPalette,
} from '../../theme';
import {filterTradesByDateRange} from '../../utils/stats';
import {
  DATE_RANGE_PRESETS,
  rangeForPreset,
  type RangePreset,
} from '../../utils/dateRange';
import type {JournalStackParamList} from '../../navigation/types';
import {useRotatingQuote} from '../../hooks/useRotatingQuote';

type Filter = 'all' | 'open' | 'reviewed' | 'win' | 'loss';

const FILTERS: {
  id: Filter;
  label: string;
  tone: FilterTone;
  heading: string;
}[] = [
  {
    id: 'all',
    label: 'All',
    tone: 'neutral',
    heading: '',
  },
  {
    id: 'open',
    label: 'Not reviewed',
    tone: 'pending',
    heading: 'Open trades — review when you exit',
  },
  {
    id: 'reviewed',
    label: 'Reviewed',
    tone: 'neutral',
    heading: 'Closed trades — lessons locked in',
  },
  {
    id: 'win',
    label: 'Wins',
    tone: 'profit',
    heading: 'Winning trades — protect the edge',
  },
  {
    id: 'loss',
    label: 'Losses',
    tone: 'loss',
    heading: 'Losing trades — study the lesson',
  },
];

function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), 'dd MMM');
  } catch {
    return iso;
  }
}

function rangeButtonLabel(
  preset: RangePreset,
  fromDate: string,
  toDate: string,
): string {
  if (preset !== 'custom') {
    return (
      DATE_RANGE_PRESETS.find(p => p.id === preset)?.label ?? 'Month'
    );
  }
  return `${shortDate(fromDate)} – ${shortDate(toDate)}`;
}

export function JournalListScreen() {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const quote = useRotatingQuote();
  const navigation =
    useNavigation<NativeStackNavigationProp<JournalStackParamList>>();
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  const trades = useJournalStore(s => s.trades);
  const strategies = useJournalStore(s => s.strategies);
  const [filter, setFilter] = useState<Filter>('all');

  const initial = rangeForPreset('month');
  const [preset, setPreset] = useState<RangePreset>('month');
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  const activeFilter = FILTERS.find(f => f.id === filter) ?? FILTERS[0];
  const isAll = filter === 'all';
  const subtitle = isAll ? quote : activeFilter.heading;

  const headingColor = isAll
    ? undefined
    : activeFilter.tone === 'pending'
      ? colors.warning
      : activeFilter.tone === 'profit'
        ? colors.profit
        : activeFilter.tone === 'loss'
          ? colors.loss
          : colors.accent;

  const applyPreset = (next: Exclude<RangePreset, 'custom'>) => {
    const range = rangeForPreset(next);
    setPreset(next);
    setFromDate(range.from);
    setToDate(range.to);
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

  const strategyMap = useMemo(() => {
    const m = new Map<string, string>();
    strategies.forEach(s => m.set(s.id, s.name));
    return m;
  }, [strategies]);

  const filtered = useMemo(() => {
    if (rangeError) {
      return [];
    }
    const inRange = filterTradesByDateRange(trades, fromDate, toDate);
    if (filter === 'open') {
      return inRange.filter(t => t.status === 'open');
    }
    if (filter === 'reviewed') {
      return inRange.filter(t => t.status === 'reviewed');
    }
    if (filter === 'win') {
      return inRange.filter(t => t.status === 'reviewed' && t.pnl > 0);
    }
    if (filter === 'loss') {
      return inRange.filter(t => t.status === 'reviewed' && t.pnl < 0);
    }
    return inRange;
  }, [trades, filter, fromDate, toDate, rangeError]);

  const listKey = `${filter}:${fromDate}:${toDate}`;
  const openTradeForm = () => navigation.navigate('TradeForm', {});
  const dateLabel = rangeButtonLabel(preset, fromDate, toDate);

  return (
    <SafeScreen>
      <View style={styles.root}>
        <ScreenHeader
          title="Journal"
          subtitle={subtitle}
          subtitleColor={headingColor}
          emphasizeSubtitle={isAll}
          right={
            <Pressable
              onPress={() => setDateSheetOpen(true)}
              style={styles.dateBtn}
              accessibilityLabel={`Date range ${dateLabel}. Change dates.`}>
              <Text style={styles.dateBtnLabel} numberOfLines={1}>
                {dateLabel}
              </Text>
              <Text style={styles.dateBtnChevron}>▾</Text>
            </Pressable>
          }
        />

        <FadeSlideIn delay={40}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filters}>
            {FILTERS.map(item => (
              <ContextFilterChip
                key={item.id}
                label={item.label}
                tone={item.tone}
                active={filter === item.id}
                onPress={() => setFilter(item.id)}
              />
            ))}
          </ScrollView>
        </FadeSlideIn>

        <FlatList
          data={filtered}
          key={listKey}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <FadeSlideIn trigger={listKey}>
              <EmptyState
                title="No trades in this range"
                message="Try another date range, or log a trade for these dates."
                actionLabel="Take trade"
                onAction={openTradeForm}
              />
            </FadeSlideIn>
          }
          renderItem={({item, index}) => (
            <FadeSlideIn
              delay={Math.min(index, 8) * 45}
              trigger={`${listKey}-${item.id}`}>
              <TradeCard
                trade={item}
                strategyName={
                  item.strategyId
                    ? strategyMap.get(item.strategyId)
                    : undefined
                }
                onPress={() =>
                  navigation.navigate('TradeDetail', {tradeId: item.id})
                }
              />
            </FadeSlideIn>
          )}
        />

        <FabButton onPress={openTradeForm} accessibilityLabel="Add trade" />

        <Modal
          visible={dateSheetOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDateSheetOpen(false)}>
          <View style={styles.sheetRoot}>
            <Pressable
              style={styles.sheetBackdrop}
              onPress={() => setDateSheetOpen(false)}
            />
            <View
              style={[
                styles.sheet,
                {paddingBottom: Math.max(insets.bottom, spacing.lg)},
              ]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Date range</Text>
              <Text style={styles.sheetHint}>
                {shortDate(fromDate)} → {shortDate(toDate)}
              </Text>

              <View style={styles.presetWrap}>
                {DATE_RANGE_PRESETS.map(item => {
                  const active = preset === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => applyPreset(item.id)}
                      style={[
                        styles.presetChip,
                        active && styles.presetChipActive,
                      ]}>
                      <Text
                        style={[
                          styles.presetChipText,
                          active && styles.presetChipTextActive,
                        ]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

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

              {rangeError ? (
                <Text style={styles.rangeError}>{rangeError}</Text>
              ) : null}

              <Button
                title="Done"
                onPress={() => setDateSheetOpen(false)}
                disabled={Boolean(rangeError)}
                style={styles.sheetDone}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeScreen>
  );
}

function createStyles(colors: ColorPalette, typography: AppTypography) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: 128,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    dateBtnLabel: {
      ...typography.caption,
      color: colors.accent,
      fontWeight: '700',
      flexShrink: 1,
    },
    dateBtnChevron: {
      ...typography.caption,
      color: colors.textMuted,
      fontSize: 11,
    },
    filtersScroll: {
      marginBottom: spacing.sm,
    },
    filters: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xs,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl + 56,
      flexGrow: 1,
    },
    sheetRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.overlay,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    sheetTitle: {
      ...typography.subtitle,
      marginBottom: spacing.xs,
    },
    sheetHint: {
      ...typography.caption,
      marginBottom: spacing.lg,
    },
    presetWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    presetChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    presetChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
    },
    presetChipText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textMuted,
    },
    presetChipTextActive: {
      color: colors.accent,
    },
    rangeRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    rangeField: {
      flex: 1,
    },
    rangeError: {
      ...typography.caption,
      color: colors.loss,
      marginBottom: spacing.sm,
    },
    sheetDone: {
      marginTop: spacing.sm,
    },
  });
}
