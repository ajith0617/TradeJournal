import type {Trade} from '../types';

/** Inclusive YYYY-MM-DD range filter */
export function filterTradesByDateRange(
  trades: Trade[],
  fromDate: string,
  toDate: string,
): Trade[] {
  const from = fromDate.trim();
  const to = toDate.trim();
  return trades.filter(t => {
    if (from && t.date < from) {
      return false;
    }
    if (to && t.date > to) {
      return false;
    }
    return true;
  });
}

/** Stats only use reviewed (closed) trades so open positions don't skew win rate */
export function computeStats(trades: Trade[]) {
  const closed = trades.filter(t => t.status === 'reviewed');
  const count = closed.length;
  const netPnl = closed.reduce((s, t) => s + t.pnl, 0);
  const wins = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl < 0);
  const winRate = count === 0 ? 0 : (wins.length / count) * 100;
  const avgWin =
    wins.length === 0
      ? 0
      : wins.reduce((s, t) => s + t.pnl, 0) / wins.length;
  const avgLoss =
    losses.length === 0
      ? 0
      : losses.reduce((s, t) => s + t.pnl, 0) / losses.length;

  return {
    count,
    netPnl: Math.round(netPnl * 100) / 100,
    winRate: Math.round(winRate * 10) / 10,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    wins: wins.length,
    losses: losses.length,
    openCount: trades.filter(t => t.status === 'open').length,
  };
}

export function pnlByStrategy(
  trades: Trade[],
  strategies: {id: string; name: string}[],
): {name: string; pnl: number; count: number}[] {
  const closed = trades.filter(t => t.status === 'reviewed');
  const map = new Map<string, {name: string; pnl: number; count: number}>();
  for (const s of strategies) {
    map.set(s.id, {name: s.name, pnl: 0, count: 0});
  }
  map.set('__none__', {name: 'No strategy', pnl: 0, count: 0});

  for (const t of closed) {
    const key = t.strategyId && map.has(t.strategyId) ? t.strategyId : '__none__';
    const row = map.get(key)!;
    row.pnl += t.pnl;
    row.count += 1;
  }

  return Array.from(map.values())
    .filter(r => r.count > 0)
    .map(r => ({...r, pnl: Math.round(r.pnl * 100) / 100}))
    .sort((a, b) => b.pnl - a.pnl);
}
