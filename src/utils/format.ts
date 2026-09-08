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

