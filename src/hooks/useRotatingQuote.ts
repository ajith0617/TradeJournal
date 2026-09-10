import {useCallback, useEffect, useState} from 'react';
import {TRADING_QUOTES} from '../data/quotes';

const ROTATE_MS = 12_000; // change quote every 12 seconds

function dayOfYearIndex(): number {
  const start = new Date();
  const dayStart = new Date(start.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (start.getTime() - dayStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  return dayOfYear % TRADING_QUOTES.length;
}

/** Rotates trading quotes on an interval; tap `nextQuote` to skip ahead. */
export function useRotatingQuote(intervalMs: number = ROTATE_MS): {
  quote: string;
  nextQuote: () => void;
} {
  const [index, setIndex] = useState(dayOfYearIndex);
  /** Bumped on manual next so the auto-rotate timer restarts */
  const [timerKey, setTimerKey] = useState(0);

  const nextQuote = useCallback(() => {
    setIndex(i => (i + 1) % TRADING_QUOTES.length);
    setTimerKey(k => k + 1);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % TRADING_QUOTES.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, timerKey]);

  return {
    quote: TRADING_QUOTES[index],
    nextQuote,
  };
}
