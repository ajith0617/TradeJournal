import React, {useMemo} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeScreen} from '../../components/SafeScreen';
import {Button} from '../../components/Button';
import {ScreenshotGallery} from '../../components/ScreenshotGallery';
import {useConfirm} from '../../components/ConfirmProvider';
import {useJournalStore} from '../../store/journalStore';
import {
  radius,
  spacing,
  useThemedStyles,
  type AppTypography,
  type ColorPalette,
} from '../../theme';
import {conditionWeightLabel, type ConditionWeight} from '../../types';
import {
  formatDisplayDate,
  formatINR,
  formatSignedINR,
} from '../../utils/format';
import type {JournalStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<JournalStackParamList, 'TradeDetail'>;

export function TradeDetailScreen({navigation, route}: Props) {
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  const {confirm} = useConfirm();
  const {tradeId} = route.params;
  const trade = useJournalStore(s => s.trades.find(t => t.id === tradeId));
  const strategies = useJournalStore(s => s.strategies);
  const deleteTrade = useJournalStore(s => s.deleteTrade);

  const strategyName = useMemo(() => {
    if (!trade?.strategyId) {
      return '—';
    }
    return strategies.find(s => s.id === trade.strategyId)?.name ?? '—';
  }, [trade, strategies]);

  const conditionMap = useMemo(() => {
    const m = new Map<string, {text: string; weight: ConditionWeight}>();
    for (const s of strategies) {
      for (const c of s.conditions) {
        m.set(c.id, {
          text: c.text,
          weight: c.weight ?? 'core',
        });
      }
    }
    return m;
  }, [strategies]);

  const reasonItems = useMemo(() => {
    if (!trade) {
      return [];
    }
    return trade.reasonConditionIds
      .map(id => conditionMap.get(id))
      .filter(
        (c): c is {text: string; weight: ConditionWeight} => Boolean(c),
      );
  }, [trade, conditionMap]);

  if (!trade) {
    return (
      <SafeScreen>
        <Text style={styles.missing}>Trade not found</Text>
        <Button title="Go back" onPress={() => navigation.goBack()} />
      </SafeScreen>
    );
  }

  const isOpen = trade.status === 'open';
  const positive = trade.pnl >= 0;

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete trade?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    deleteTrade(trade.id);
    navigation.goBack();
  };

  return (
    <SafeScreen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{trade.stockName}</Text>
        <Pressable
          onPress={() =>
            navigation.navigate('TradeForm', {tradeId: trade.id})
          }>
          <Text style={styles.edit}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.statusBadge,
            isOpen ? styles.statusOpen : styles.statusReviewed,
          ]}>
          <Text
            style={[
              styles.statusText,
              isOpen ? styles.statusTextOpen : styles.statusTextReviewed,
            ]}>
            {isOpen
              ? 'Not reviewed'
              : trade.outcome === 'win'
                ? 'Reviewed · Win'
                : trade.outcome === 'loss'
                  ? 'Reviewed · Loss'
                  : 'Reviewed'}
          </Text>
        </View>

        {isOpen ? (
          <Text style={styles.openHint}>Open trade — review when you exit</Text>
        ) : (
          <Text style={[styles.pnl, positive ? styles.profit : styles.loss]}>
            {formatSignedINR(trade.pnl)}
          </Text>
        )}
        <Text style={styles.date}>{formatDisplayDate(trade.date)}</Text>

        <View style={styles.grid}>
          <Row label="Segment" value={trade.segment} />
          <Row label="Direction" value={trade.direction} />
          <Row label="Quantity" value={String(trade.quantity)} />
          <Row label="Entry" value={formatINR(trade.entryPrice)} />
          <Row
            label="Stop loss"
            value={
              trade.stopLoss != null ? formatINR(trade.stopLoss) : '—'
            }
          />
          <Row
            label="Target"
            value={
              trade.targetPrice != null ? formatINR(trade.targetPrice) : '—'
            }
          />
          {!isOpen ? (
            <>
              <Row
                label="Exit level"
                value={
                  trade.exitPrice != null ? formatINR(trade.exitPrice) : '—'
                }
              />
              <Row
                label="Charges"
                value={trade.charges ? formatINR(trade.charges) : '—'}
              />
            </>
          ) : null}
          <Row label="Strategy" value={strategyName} />
          <Row label="Emotion" value={trade.emotion} />
        </View>

        {reasonItems.length > 0 ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Reasons to buy</Text>
            {reasonItems.map(item => (
              <View key={item.text} style={styles.reasonRow}>
                <Text
                  style={[
                    styles.reqBadge,
                    item.weight === 'secondary'
                      ? styles.reqSecondary
                      : item.weight === 'minor'
                        ? styles.reqMinor
                        : styles.reqCore,
                  ]}>
                  {conditionWeightLabel(item.weight)}
                </Text>
                <Text style={styles.notes}>· {item.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {trade.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Entry notes</Text>
            <Text style={styles.notes}>{trade.notes}</Text>
          </View>
        ) : null}

        {!isOpen && trade.reviewNotes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Review notes</Text>
            <Text style={styles.notes}>{trade.reviewNotes}</Text>
          </View>
        ) : null}

        {trade.images.length > 0 ? (
          <View>
            <Text style={styles.notesLabel}>Screenshots</Text>
            <Text style={styles.zoomHint}>Tap to view · pinch to zoom</Text>
            <ScreenshotGallery
              images={trade.images}
              imageStyle={styles.image}
            />
          </View>
        ) : null}

        {isOpen ? (
          <Button
            title="Exit & review trade"
            onPress={() =>
              navigation.navigate('TradeReview', {tradeId: trade.id})
            }
            style={styles.reviewBtn}
          />
        ) : (
          <Button
            title="Edit review"
            variant="secondary"
            onPress={() =>
              navigation.navigate('TradeReview', {tradeId: trade.id})
            }
            style={styles.reviewBtn}
          />
        )}

        <Button
          title="Delete trade"
          variant="danger"
          onPress={onDelete}
          style={styles.delete}
        />
      </ScrollView>
    </SafeScreen>
  );
}

function Row({label, value}: {label: string; value: string}) {
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ColorPalette, typography: AppTypography) {
  return StyleSheet.create({
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
    color: colors.accent,
    minWidth: 56,
  },
  edit: {
    ...typography.body,
    color: colors.accent,
    minWidth: 56,
    textAlign: 'right',
  },
  title: {
    ...typography.subtitle,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  statusOpen: {
    backgroundColor: 'rgba(240, 180, 41, 0.15)',
  },
  statusReviewed: {
    backgroundColor: colors.accentMuted,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  statusTextOpen: {
    color: colors.warning,
  },
  statusTextReviewed: {
    color: colors.accent,
  },
  openHint: {
    ...typography.bodyMuted,
    marginTop: spacing.xs,
  },
  pnl: {
    ...typography.numberLarge,
    marginTop: spacing.sm,
  },
  profit: {color: colors.profit},
  loss: {color: colors.loss},
  date: {
    ...typography.bodyMuted,
    marginBottom: spacing.xl,
  },
  grid: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  rowLabel: {
    ...typography.caption,
  },
  rowValue: {
    ...typography.body,
    fontWeight: '600',
  },
  notesBox: {
    marginBottom: spacing.xl,
  },
  notesLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  zoomHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  notes: {
    ...typography.body,
  },
  reasonRow: {
    marginBottom: spacing.sm,
  },
  reqBadge: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  reqCore: {
    color: colors.accent,
  },
  reqSecondary: {
    color: colors.warning,
  },
  reqMinor: {
    color: colors.textMuted,
  },
  image: {
    width: 110,
    height: 110,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  reviewBtn: {
    marginTop: spacing.md,
  },
  delete: {
    marginTop: spacing.md,
  },
  missing: {
    ...typography.body,
    marginVertical: spacing.xl,
  },
});
}

