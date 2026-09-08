import React, {useMemo, useState} from 'react';
import {FlatList, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeScreen} from '../../components/SafeScreen';
import {ScreenHeader} from '../../components/ScreenHeader';
import {TradeCard} from '../../components/TradeCard';
import {EmptyState} from '../../components/EmptyState';
import {FadeSlideIn} from '../../components/FadeSlideIn';
import {FabButton} from '../../components/FabButton';
import {
  ContextFilterChip,
  type FilterTone,
} from '../../components/ContextFilterChip';
import {useJournalStore} from '../../store/journalStore';
import {spacing, useTheme, useThemedStyles} from '../../theme';
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

export function JournalListScreen() {
  const {colors} = useTheme();
  const quote = useRotatingQuote();
  const navigation =
    useNavigation<NativeStackNavigationProp<JournalStackParamList>>();
  const styles = useThemedStyles(() =>
    StyleSheet.create({
      root: {
        flex: 1,
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
    }),
  );
  const trades = useJournalStore(s => s.trades);
  const strategies = useJournalStore(s => s.strategies);
  const [filter, setFilter] = useState<Filter>('all');

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

  const strategyMap = useMemo(() => {
    const m = new Map<string, string>();
    strategies.forEach(s => m.set(s.id, s.name));
    return m;
  }, [strategies]);

  const filtered = useMemo(() => {
    if (filter === 'open') {
      return trades.filter(t => t.status === 'open');
    }
    if (filter === 'reviewed') {
      return trades.filter(t => t.status === 'reviewed');
    }
    if (filter === 'win') {
      return trades.filter(t => t.status === 'reviewed' && t.pnl > 0);
    }
    if (filter === 'loss') {
      return trades.filter(t => t.status === 'reviewed' && t.pnl < 0);
    }
    return trades;
  }, [trades, filter]);

  const openTradeForm = () => navigation.navigate('TradeForm', {});

  return (
    <SafeScreen>
      <View style={styles.root}>
        <ScreenHeader
          title="Journal"
          subtitle={subtitle}
          subtitleColor={headingColor}
          emphasizeSubtitle={isAll}
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
          key={filter}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <FadeSlideIn trigger={filter}>
              <EmptyState
                title="No trades yet"
                message="When you take a trade, log entry first. Review when you exit."
                actionLabel="Take trade"
                onAction={openTradeForm}
              />
            </FadeSlideIn>
          }
          renderItem={({item, index}) => (
            <FadeSlideIn
              delay={Math.min(index, 8) * 45}
              trigger={`${filter}-${item.id}`}>
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

        <FabButton
          onPress={openTradeForm}
          accessibilityLabel="Add trade"
        />
      </View>
    </SafeScreen>
  );
}
