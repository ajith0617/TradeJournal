import React, {useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {parseISO} from 'date-fns';
import {SafeScreen} from '../../components/SafeScreen';
import {Button} from '../../components/Button';
import {Input} from '../../components/Input';
import {DateField} from '../../components/DateField';
import {FieldLabel} from '../../components/FieldLabel';
import {useJournalStore} from '../../store/journalStore';
import {
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type AppTypography,
  type ColorPalette,
} from '../../theme';
import type {TradeOutcome} from '../../types';
import {
  calcPnl,
  calcPnlPercent,
  calcTradedAmount,
  exitLevelForOutcome,
  formatDisplayDate,
  formatINR,
  formatSignedINR,
  formatSignedPercent,
  todayISO,
} from '../../utils/format';
import type {JournalStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<JournalStackParamList, 'TradeReview'>;

/** Exit price required when both SL and target were missing at entry. */
function isExitPriceRequired(
  stopLoss?: number,
  targetPrice?: number,
): boolean {
  return stopLoss == null && targetPrice == null;
}

export function TradeReviewScreen({navigation, route}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  const {tradeId} = route.params;
  const trade = useJournalStore(s => s.trades.find(t => t.id === tradeId));
  const updateTrade = useJournalStore(s => s.updateTrade);

  const [outcome, setOutcome] = useState<TradeOutcome | undefined>(
    trade?.outcome,
  );
  const [exitDate, setExitDate] = useState(
    trade?.exitDate || todayISO(),
  );
  const [exitPrice, setExitPrice] = useState(
    trade?.exitPrice != null ? String(trade.exitPrice) : '',
  );
  const [charges, setCharges] = useState(
    trade?.charges ? String(trade.charges) : '',
  );
  const [reviewFollowNotes, setReviewFollowNotes] = useState(
    trade?.reviewFollowNotes ?? trade?.reviewNotes ?? '',
  );
  const [reviewAvoidNotes, setReviewAvoidNotes] = useState(
    trade?.reviewAvoidNotes ?? '',
  );

  const exitRequired = trade
    ? isExitPriceRequired(trade.stopLoss, trade.targetPrice)
    : true;

  const exitDateError = useMemo(() => {
    if (!exitDate.trim()) {
      return 'Exit date is required';
    }
    if (trade?.date && exitDate < trade.date) {
      return 'Exit date cannot be before entry date';
    }
    return '';
  }, [trade?.date, exitDate]);

  const preview = useMemo(() => {
    if (!trade || !outcome) {
      return null;
    }

    const typedExit = exitPrice.trim() ? Number(exitPrice) : undefined;
    const hasTypedExit =
      typedExit != null && Number.isFinite(typedExit) && typedExit > 0;

    const fallback = exitLevelForOutcome(
      outcome,
      trade.targetPrice,
      trade.stopLoss,
    );

    if (exitRequired) {
      if (!hasTypedExit) {
        return {ready: false as const, exit: undefined, pnl: 0, source: 'manual' as const};
      }
      const ch = Number(charges) || 0;
      return {
        ready: true as const,
        exit: typedExit,
        pnl: calcPnl(
          trade.direction,
          trade.quantity,
          trade.entryPrice,
          typedExit,
          ch,
        ),
        source: 'manual' as const,
      };
    }

    const exit = hasTypedExit ? typedExit : fallback;
    if (exit == null) {
      return {ready: false as const, exit: undefined, pnl: 0, source: 'fallback' as const};
    }

    const ch = Number(charges) || 0;
    return {
      ready: true as const,
      exit,
      pnl: calcPnl(
        trade.direction,
        trade.quantity,
        trade.entryPrice,
        exit,
        ch,
      ),
      source: hasTypedExit ? ('manual' as const) : ('fallback' as const),
    };
  }, [trade, outcome, exitPrice, charges, exitRequired]);

  const previewPct =
    trade && preview?.ready
      ? calcPnlPercent(preview.pnl, trade.entryPrice, trade.quantity)
      : null;
  const tradedAmt = trade
    ? calcTradedAmount(trade.entryPrice, trade.quantity)
    : 0;

  const canSave = Boolean(
    outcome && preview?.ready && !exitDateError && exitDate.trim(),
  );

  if (!trade) {
    return (
      <SafeScreen>
        <Text style={styles.missing}>Trade not found</Text>
        <Button title="Go back" onPress={() => navigation.goBack()} />
      </SafeScreen>
    );
  }

  const onSave = () => {
    if (!canSave || !outcome || !preview?.ready || preview.exit == null) {
      return;
    }

    const ch = Number(charges) || 0;
    const pct = calcPnlPercent(
      preview.pnl,
      trade.entryPrice,
      trade.quantity,
    );
    const follow = reviewFollowNotes.trim();
    const avoid = reviewAvoidNotes.trim();
    updateTrade(trade.id, {
      outcome,
      exitPrice: preview.exit,
      exitDate: exitDate.trim(),
      charges: ch,
      pnl: preview.pnl,
      pnlPercent: pct ?? undefined,
      reviewFollowNotes: follow,
      reviewAvoidNotes: avoid,
      reviewNotes: [follow, avoid].filter(Boolean).join('\n\n'),
      status: 'reviewed',
      reviewedAt: new Date().toISOString(),
    });
    navigation.goBack();
  };

  return (
    <SafeScreen keyboardAvoiding>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>
          {trade?.isPaper ? 'Review paper trade' : 'Review trade'}
        </Text>
        <View style={{width: 48}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={styles.stock}>{trade.stockName}</Text>
        <Text style={styles.meta}>
          Entry {formatINR(trade.entryPrice)} · Qty {trade.quantity} ·{' '}
          {trade.direction}
        </Text>
        <Text style={styles.levels}>
          Entry date {formatDisplayDate(trade.date)} · Target{' '}
          {trade.targetPrice != null ? formatINR(trade.targetPrice) : '—'} · SL{' '}
          {trade.stopLoss != null ? formatINR(trade.stopLoss) : '—'}
        </Text>

        <FieldLabel label="Result" required />
        <View style={styles.outcomeRow}>
          <Pressable
            onPress={() => setOutcome('win')}
            style={[
              styles.outcomeChip,
              outcome === 'win' && styles.outcomeWin,
            ]}>
            <Text
              style={[
                styles.outcomeText,
                outcome === 'win' && styles.outcomeTextWin,
              ]}>
              Win
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setOutcome('loss')}
            style={[
              styles.outcomeChip,
              outcome === 'loss' && styles.outcomeLoss,
            ]}>
            <Text
              style={[
                styles.outcomeText,
                outcome === 'loss' && styles.outcomeTextLoss,
              ]}>
              Loss
            </Text>
          </Pressable>
        </View>

        <DateField
          label="Exit date"
          required
          value={exitDate}
          onChange={setExitDate}
          minimumDate={trade.date ? parseISO(trade.date) : undefined}
        />
        {exitDateError ? (
          <Text style={styles.dateError}>{exitDateError}</Text>
        ) : null}

        <Input
          label="Exit price (₹)"
          required={exitRequired}
          value={exitPrice}
          onChangeText={setExitPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        {outcome && preview?.ready ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>
              {preview.source === 'manual'
                ? 'P&L at exit'
                : outcome === 'win'
                  ? 'Win at target'
                  : 'Loss at stop loss'}
            </Text>
            <Text style={styles.resultExit}>
              Exit level {formatINR(preview.exit!)}
            </Text>
            <Text style={styles.resultExit}>
              Traded amount {formatINR(tradedAmt)}
            </Text>
            <Text
              style={[
                styles.resultPnl,
                {
                  color: preview.pnl >= 0 ? colors.profit : colors.loss,
                },
              ]}>
              {formatSignedINR(preview.pnl)}
            </Text>
            <Text
              style={[
                styles.resultPct,
                {
                  color:
                    previewPct == null
                      ? colors.textMuted
                      : preview.pnl >= 0
                        ? colors.profit
                        : colors.loss,
                },
              ]}>
              {previewPct == null
                ? 'P&L % unavailable'
                : formatSignedPercent(previewPct)}
            </Text>
          </View>
        ) : null}

        <Input
          label="Charges (₹)"
          value={charges}
          onChangeText={setCharges}
          keyboardType="decimal-pad"
          placeholder="0"
        />

        <Text style={styles.reviewSectionTitle}>After exit — lessons</Text>
        <Text style={styles.reviewSectionSub}>
          Split what worked from what to avoid so the next trade is clearer
        </Text>

        <View style={[styles.lessonCard, styles.lessonCardFollow]}>
          <Text style={[styles.lessonEyebrow, styles.lessonEyebrowFollow]}>
            What to follow
          </Text>
          <Text style={[styles.lessonTitle, styles.lessonTitleFollow]}>
            Good things
          </Text>
          <Text style={styles.lessonHint}>
            Habits and decisions you want to keep doing
          </Text>
          <Input
            value={reviewFollowNotes}
            onChangeText={setReviewFollowNotes}
            placeholder="e.g. Waited for confirmation · Sized risk correctly"
            multiline
            style={styles.lessonInput}
          />
        </View>

        <View style={[styles.lessonCard, styles.lessonCardAvoid]}>
          <Text style={[styles.lessonEyebrow, styles.lessonEyebrowAvoid]}>
            What not to follow
          </Text>
          <Text style={[styles.lessonTitle, styles.lessonTitleAvoid]}>
            Bad things
          </Text>
          <Text style={styles.lessonHint}>
            Mistakes and patterns to skip next time
          </Text>
          <Input
            value={reviewAvoidNotes}
            onChangeText={setReviewAvoidNotes}
            placeholder="e.g. Moved stop early · Chased after FOMO"
            multiline
            style={styles.lessonInput}
          />
        </View>

        <Button
          title="Complete review"
          onPress={onSave}
          disabled={!canSave}
          style={styles.save}
        />
      </ScrollView>
    </SafeScreen>
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
    width: 64,
  },
  title: {
    ...typography.subtitle,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  stock: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  meta: {
    ...typography.bodyMuted,
  },
  levels: {
    ...typography.caption,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },
  dateError: {
    ...typography.caption,
    color: colors.loss,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  outcomeChip: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  outcomeWin: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  outcomeLoss: {
    borderColor: colors.loss,
    backgroundColor: colors.lossMuted,
  },
  outcomeText: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  outcomeTextWin: {
    color: colors.accent,
  },
  outcomeTextLoss: {
    color: colors.loss,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  resultLabel: {
    ...typography.label,
  },
  resultExit: {
    ...typography.bodyMuted,
    marginTop: spacing.xs,
  },
  resultPnl: {
    ...typography.numberLarge,
    marginTop: spacing.sm,
  },
  resultPct: {
    ...typography.subtitle,
    fontSize: 18,
    marginTop: spacing.xs,
  },
  reviewSectionTitle: {
    ...typography.subtitle,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  reviewSectionSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  lessonCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  lessonCardFollow: {
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderColor: colors.borderSubtle,
    borderLeftColor: colors.profit,
  },
  lessonCardAvoid: {
    backgroundColor: colors.lossMuted,
    borderColor: colors.borderSubtle,
    borderLeftColor: colors.loss,
  },
  lessonEyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  lessonEyebrowFollow: {
    color: colors.profit,
  },
  lessonEyebrowAvoid: {
    color: colors.loss,
  },
  lessonTitle: {
    ...typography.subtitle,
    fontSize: 16,
    marginBottom: 2,
  },
  lessonTitleFollow: {
    color: colors.profit,
  },
  lessonTitleAvoid: {
    color: colors.loss,
  },
  lessonHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  lessonInput: {
    minHeight: 96,
    textAlignVertical: 'top' as const,
    marginBottom: 0,
  },
  save: {
    marginTop: spacing.lg,
  },
  missing: {
    ...typography.body,
    margin: spacing.xl,
  },
});
}

