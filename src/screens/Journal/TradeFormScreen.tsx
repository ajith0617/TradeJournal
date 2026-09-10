import React, {useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {
  deleteTradeImages,
  persistTradeImages,
  tradeImageFileName,
} from '../../services/tradeImages';
import {ScreenshotGallery} from '../../components/ScreenshotGallery';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeScreen} from '../../components/SafeScreen';
import {Button} from '../../components/Button';
import {Input} from '../../components/Input';
import {DateField} from '../../components/DateField';
import {SegmentedControl} from '../../components/SegmentedControl';
import {useJournalStore} from '../../store/journalStore';
import {
  radius,
  spacing,
  useThemedStyles,
  type AppTypography,
  type ColorPalette,
} from '../../theme';
import type {Direction, Emotion, Segment} from '../../types';
import {
  conditionWeightLabel,
  conditionWeightMarks,
  scoreTradeConditions,
} from '../../types';
import {todayISO} from '../../utils/format';
import type {JournalStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<JournalStackParamList, 'TradeForm'>;

const EMOTIONS: Emotion[] = [
  'Calm',
  'Confident',
  'FOMO',
  'Revenge',
  'Anxious',
  'Greedy',
  'Over trade',
  'Neutral',
];

export function TradeFormScreen({navigation, route}: Props) {
  const styles = useThemedStyles(t => createStyles(t.colors, t.typography));
  const tradeId = route.params?.tradeId;
  const isPaperNew = route.params?.isPaper === true;
  const existing = useJournalStore(s =>
    tradeId ? s.trades.find(t => t.id === tradeId) : undefined,
  );
  const isPaper = existing?.isPaper === true || (!existing && isPaperNew);
  const strategies = useJournalStore(s => s.strategies);
  const addTrade = useJournalStore(s => s.addTrade);
  const updateTrade = useJournalStore(s => s.updateTrade);
  const removeTradeImage = useJournalStore(s => s.removeTradeImage);

  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [stockName, setStockName] = useState(existing?.stockName ?? '');
  const [segment, setSegment] = useState<Segment>(existing?.segment ?? 'Equity');
  const [direction, setDirection] = useState<Direction>(
    existing?.direction ?? 'Buy',
  );
  const [quantity, setQuantity] = useState(
    existing ? String(existing.quantity) : '',
  );
  const [entryPrice, setEntryPrice] = useState(
    existing ? String(existing.entryPrice) : '',
  );
  const [stopLoss, setStopLoss] = useState(
    existing?.stopLoss != null ? String(existing.stopLoss) : '',
  );
  const [targetPrice, setTargetPrice] = useState(
    existing?.targetPrice != null ? String(existing.targetPrice) : '',
  );
  const [strategyId, setStrategyId] = useState<string | undefined>(
    existing?.strategyId,
  );
  const [reasonConditionIds, setReasonConditionIds] = useState<string[]>(
    existing?.reasonConditionIds ?? [],
  );
  const [emotion, setEmotion] = useState<Emotion>(
    existing?.emotion ?? 'Neutral',
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [images, setImages] = useState<string[]>(
    () => (existing?.images ?? []).map(tradeImageFileName),
  );

  useEffect(() => {
    setImages((existing?.images ?? []).map(tradeImageFileName));
  }, [existing?.id]);
  const selectedStrategy = strategies.find(s => s.id === strategyId);

  const conditionMarks = useMemo(() => {
    if (!selectedStrategy?.conditions.length) {
      return {score: 0, max: 0};
    }
    return scoreTradeConditions(
      selectedStrategy.conditions,
      reasonConditionIds,
    );
  }, [selectedStrategy, reasonConditionIds]);

  const canSave = useMemo(() => {
    const name = stockName.trim();
    const q = Number(quantity);
    const entry = Number(entryPrice);
    return (
      Boolean(date) &&
      Boolean(name) &&
      Number.isFinite(q) &&
      q > 0 &&
      Number.isFinite(entry) &&
      entry > 0
    );
  }, [date, stockName, quantity, entryPrice]);

  const selectStrategy = (id: string | undefined) => {
    setStrategyId(id);
    setReasonConditionIds([]);
  };

  const toggleReason = (id: string) => {
    setReasonConditionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const pickImages = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 5,
      quality: 0.8,
      includeBase64: true,
    });
    if (result.didCancel || result.errorCode) {
      return;
    }
    const assets = result.assets ?? [];
    if (assets.length === 0) {
      return;
    }
    const saved = await persistTradeImages(assets);
    if (saved.length === 0) {
      return;
    }
    setImages(prev => [...prev, ...saved].slice(0, 8));
  };

  const removeImage = (uri: string) => {
    const name = tradeImageFileName(uri);
    setImages(prev => prev.filter(i => tradeImageFileName(i) !== name));

    // Instantly remove from app storage + Download/Journal/images
    if (existing) {
      removeTradeImage(existing.id, name);
    } else {
      void deleteTradeImages([name]);
    }
  };

  const onSave = () => {
    if (!canSave) {
      return;
    }
    const name = stockName.trim().toUpperCase();
    const q = Number(quantity);
    const entry = Number(entryPrice);
    const sl = stopLoss.trim() ? Number(stopLoss) : undefined;
    const tp = targetPrice.trim() ? Number(targetPrice) : undefined;

    const payload = {
      date: date.trim() || todayISO(),
      stockName: name,
      segment,
      direction,
      quantity: q,
      entryPrice: entry,
      stopLoss: sl != null && !Number.isNaN(sl) ? sl : undefined,
      targetPrice: tp != null && !Number.isNaN(tp) ? tp : undefined,
      reasonConditionIds,
      strategyId,
      conditionScore: conditionMarks.score,
      conditionScoreMax: conditionMarks.max,
      emotion,
      notes: notes.trim(),
      images: images.map(tradeImageFileName),
      status: (existing?.status === 'reviewed' ? 'reviewed' : 'open') as
        | 'open'
        | 'reviewed',
      charges: existing?.charges ?? 0,
      pnl: existing?.status === 'reviewed' ? existing.pnl : 0,
      reviewNotes: existing?.reviewNotes ?? '',
      exitPrice: existing?.exitPrice,
      outcome: existing?.outcome,
      reviewedAt: existing?.reviewedAt,
      isPaper,
    };

    if (existing) {
      updateTrade(existing.id, payload);
    } else {
      addTrade(payload);
    }
    navigation.goBack();
  };

  return (
    <SafeScreen keyboardAvoiding>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>
          {existing
            ? isPaper
              ? 'Edit paper entry'
              : 'Edit entry'
            : isPaper
              ? 'Paper trade'
              : 'Take trade'}
        </Text>
        <View style={{width: 48}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <DateField
          label="Entry date"
          required
          value={date}
          onChange={setDate}
        />
        <Input
          label="Stock name"
          required
          value={stockName}
          onChangeText={setStockName}
          placeholder="RELIANCE / NIFTY / BANKNIFTY"
          autoCapitalize="characters"
        />

        <SegmentedControl
          label="Segment"
          required
          options={[
            {label: 'Equity', value: 'Equity'},
            {label: 'F&O', value: 'F&O'},
          ]}
          value={segment}
          onChange={setSegment}
        />

        <SegmentedControl
          label="Direction"
          required
          options={[
            {label: 'Buy', value: 'Buy'},
            {label: 'Sell', value: 'Sell'},
          ]}
          value={direction}
          onChange={setDirection}
        />

        <Input
          label="Quantity"
          required
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="0"
        />
        <Input
          label="Entry price (₹)"
          required
          value={entryPrice}
          onChangeText={setEntryPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Input
          label="Stop loss (₹)"
          value={stopLoss}
          onChangeText={setStopLoss}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Input
          label="Target price (₹)"
          value={targetPrice}
          onChangeText={setTargetPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Text style={styles.sectionLabel}>Strategy</Text>
        <View style={styles.strategyRow}>
          <Pressable
            onPress={() => selectStrategy(undefined)}
            style={[
              styles.strategyChip,
              !strategyId && styles.strategyChipActive,
            ]}>
            <Text
              style={[
                styles.strategyText,
                !strategyId && styles.strategyTextActive,
              ]}>
              None
            </Text>
          </Pressable>
          {strategies.map(s => (
            <Pressable
              key={s.id}
              onPress={() => selectStrategy(s.id)}
              style={[
                styles.strategyChip,
                strategyId === s.id && styles.strategyChipActive,
              ]}>
              <Text
                style={[
                  styles.strategyText,
                  strategyId === s.id && styles.strategyTextActive,
                ]}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Reason to buy</Text>
        <Text style={styles.hintTop}>
          Select strategy conditions that apply. Core = 2 marks · Minor = 1
          mark.
        </Text>
        {!strategyId ? (
          <Text style={styles.hintTop}>
            Pick a strategy first to see its conditions.
          </Text>
        ) : !selectedStrategy?.conditions.length ? (
          <Text style={styles.hintTop}>
            This strategy has no conditions — add them in the Strategy tab.
          </Text>
        ) : (
          <>
            <View style={styles.markBanner}>
              <Text style={styles.markLabel}>Setup mark</Text>
              <Text style={styles.markValue}>
                {conditionMarks.score} / {conditionMarks.max}
              </Text>
            </View>
            <View style={styles.strategyRow}>
              {selectedStrategy.conditions.map(c => {
                const on = reasonConditionIds.includes(c.id);
                const marks = conditionWeightMarks(c.weight);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => toggleReason(c.id)}
                    style={[
                      styles.strategyChip,
                      on && styles.strategyChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.reqBadge,
                        c.weight === 'minor' ? styles.reqMinor : styles.reqCore,
                      ]}>
                      {conditionWeightLabel(c.weight)} · {marks}
                    </Text>
                    <Text
                      style={[
                        styles.strategyText,
                        on && styles.strategyTextActive,
                      ]}>
                      {c.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <SegmentedControl
          label="Emotion"
          required
          options={EMOTIONS.map(e => ({label: e, value: e}))}
          value={emotion}
          onChange={setEmotion}
        />

        <Input
          label="Entry notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Why this trade? Setup context…"
          multiline
          style={{minHeight: 90, textAlignVertical: 'top'}}
        />

        <Text style={styles.sectionLabel}>Screenshots</Text>
        <Text style={styles.hintTop}>
          Tap to view · Delete from full-screen view
        </Text>
        <ScreenshotGallery
          images={images}
          imageStyle={styles.image}
          onRemove={removeImage}
          style={styles.imagesRow}
          trailing={
            <Pressable onPress={pickImages} style={styles.addImage}>
              <Text style={styles.addImageText}>+</Text>
            </Pressable>
          }
        />

        <Button
          title={existing ? 'Save entry' : 'Save open trade'}
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
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  hintTop: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  markBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  markLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  markValue: {
    ...typography.subtitle,
    fontSize: 18,
    color: colors.accent,
  },
  strategyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  strategyChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  strategyChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  strategyText: {
    ...typography.caption,
  },
  strategyTextActive: {
    color: colors.accent,
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
  reqMinor: {
    color: colors.textMuted,
  },
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  addImage: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addImageText: {
    fontSize: 28,
    color: colors.textMuted,
  },
  save: {
    marginTop: spacing.md,
  },
});
}

