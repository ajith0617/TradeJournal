import {format, parseISO, isValid, differenceInCalendarDays} from 'date-fns';

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

/**
 * Calendar days from entry to exit.
 * Same day → 0. Returns null if dates are missing/invalid or exit before entry.
 */
export function calcTradeHoldDays(
  entryDate: string,
  exitDate?: string,
): number | null {
  if (!entryDate?.trim() || !exitDate?.trim()) {
    return null;
  }
  try {
    const entry = parseISO(entryDate.trim());
    const exit = parseISO(exitDate.trim());
    if (!isValid(entry) || !isValid(exit)) {
      return null;
    }
    const days = differenceInCalendarDays(exit, entry);
    if (days < 0) {
      return null;
    }
    return days;
  } catch {
    return null;
  }
}

/** e.g. Same day / 1 day / 5 days */
export function formatHoldDays(days: number): string {
  if (days <= 0) {
    return 'Same day';
  }
  if (days === 1) {
    return '1 day';
  }
  return `${days} days`;
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

