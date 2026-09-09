import {format, parseISO, isValid} from 'date-fns';

export function formatINR(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
  });
  return `${sign}₹${formatted}`;
}

export function formatSignedINR(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
  });
  return `${sign}₹${formatted}`;
}

/** e.g. +2.45% / -1.10% / 0% */
export function formatSignedPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}${abs.toFixed(digits)}%`;
}

/** Capital deployed for the trade: entry price × quantity. */
export function calcTradedAmount(entryPrice: number, quantity: number): number {
  const entry = Number(entryPrice);
  const qty = Number(quantity);
  if (!Number.isFinite(entry) || !Number.isFinite(qty) || entry <= 0 || qty <= 0) {
    return 0;
  }
  return Math.round(entry * qty * 100) / 100;
}

/**
 * P&L % = (profitOrLossAmount / tradedAmount) × 100
 * where tradedAmount = entry × quantity.
 */
export function calcPnlPercent(
  pnl: number,
  entryPrice: number,
  quantity: number,
): number | null {
  const traded = calcTradedAmount(entryPrice, quantity);
  const net = Number(pnl);
  if (traded <= 0 || !Number.isFinite(net)) {
    return null;
  }
  return Math.round((net / traded) * 10000) / 100;
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDisplayDate(isoDate: string): string {
  try {
    const d = parseISO(isoDate);
    if (!isValid(d)) {
      return isoDate;
    }
    return format(d, 'dd MMM yyyy');
  } catch {
    return isoDate;
  }
}

export function calcPnl(
  direction: 'Buy' | 'Sell',
  quantity: number,
  entryPrice: number,
  exitPrice: number,
  charges: number,
): number {
  const gross =
    direction === 'Buy'
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;
  return Math.round((gross - charges) * 100) / 100;
}

/** Win → target price; Loss → stop loss */
export function exitLevelForOutcome(
  outcome: 'win' | 'loss',
  targetPrice?: number,
  stopLoss?: number,
): number | undefined {
  if (outcome === 'win') {
    return targetPrice;
  }
  return stopLoss;
}

