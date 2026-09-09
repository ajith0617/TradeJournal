import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {Trade} from '../types';
import {radius, spacing, useThemedStyles} from '../theme';
import {
  calcPnlPercent,
  formatDisplayDate,
  formatSignedINR,
  formatSignedPercent,
} from '../utils/format';
import {TradeImage} from './TradeImage';

interface Props {
  trade: Trade;
  strategyName?: string;
  onPress: () => void;
}

export function TradeCard({trade, strategyName, onPress}: Props) {
  const isOpen = trade.status === 'open';
  const positive = trade.pnl >= 0;
  const pnlPercent = !isOpen
    ? (trade.pnlPercent ??
      calcPnlPercent(trade.pnl, trade.entryPrice, trade.quantity))
    : null;
  const styles = useThemedStyles(({colors, typography}) =>
    StyleSheet.create({
      card: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: spacing.lg,
        marginBottom: spacing.md,
      },
      pressed: {
        opacity: 0.9,
      },
      top: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      },
      left: {
        flex: 1,
        paddingRight: spacing.md,
      },
      titleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
      },
      symbol: {
        ...typography.subtitle,
      },
      badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 4,
      },
      badgeOpen: {
        backgroundColor: 'rgba(240, 180, 41, 0.15)',
      },
      badgeReviewed: {
        backgroundColor: colors.accentMuted,
      },
      badgeText: {
        fontSize: 10,
        fontWeight: '700',
      },
      badgeTextOpen: {
        color: colors.warning,
      },
      badgeTextReviewed: {
        color: colors.accent,
      },
      meta: {
        ...typography.caption,
        marginTop: 2,
      },
      pnlCol: {
        alignItems: 'flex-end',
        maxWidth: '46%',
      },
      pnl: {
        ...typography.number,
        fontSize: 16,
      },
      pnlPct: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 3,
      },
      openPnl: {
        ...typography.caption,
        color: colors.warning,
        fontWeight: '700',
      },
      profit: {
        color: colors.profit,
      },
      loss: {
        color: colors.loss,
      },
      bottom: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      tag: {
        ...typography.caption,
        color: colors.accent,
      },
      tagMuted: {
        ...typography.caption,
        color: colors.textDim,
      },
      bottomLeft: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
        paddingRight: spacing.sm,
      },
      markChip: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: colors.accentMuted,
      },
      markChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.accent,
      },
      thumbs: {
        flexDirection: 'row',
        gap: 4,
      },
      thumb: {
        width: 28,
        height: 28,
        borderRadius: 4,
        backgroundColor: colors.surfaceElevated,
      },
    }),
  );

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={styles.left}>
          <View style={styles.titleRow}>
            <Text style={styles.symbol}>{trade.stockName}</Text>
            <View
              style={[
                styles.badge,
                isOpen ? styles.badgeOpen : styles.badgeReviewed,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  isOpen ? styles.badgeTextOpen : styles.badgeTextReviewed,
                ]}>
                {isOpen ? 'Not reviewed' : 'Reviewed'}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {trade.direction} · {trade.segment} · {formatDisplayDate(trade.date)}
          </Text>
        </View>
        {isOpen ? (
          <Text style={styles.openPnl}>Open</Text>
        ) : (
          <View style={styles.pnlCol}>
            <Text
              style={[styles.pnl, positive ? styles.profit : styles.loss]}
              numberOfLines={1}>
              {formatSignedINR(trade.pnl)}
            </Text>
            <Text
              style={[styles.pnlPct, positive ? styles.profit : styles.loss]}
              numberOfLines={1}>
              {pnlPercent == null ? '—' : formatSignedPercent(pnlPercent)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.bottom}>
        <View style={styles.bottomLeft}>
          {strategyName ? (
            <Text style={styles.tag}>{strategyName}</Text>
          ) : (
            <Text style={styles.tagMuted}>No strategy</Text>
          )}
          {trade.conditionScoreMax != null && trade.conditionScoreMax > 0 ? (
            <View style={styles.markChip}>
              <Text style={styles.markChipText}>
                {trade.conditionScore ?? 0}/{trade.conditionScoreMax}
              </Text>
            </View>
          ) : null}
        </View>
        {trade.images.length > 0 ? (
          <View style={styles.thumbs}>
            {trade.images.slice(0, 3).map((uri, i) => (
              <TradeImage
                key={`${uri}-${i}`}
                uri={uri}
                style={styles.thumb}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
