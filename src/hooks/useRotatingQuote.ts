import {useEffect, useState} from 'react';
import {TRADING_QUOTES} from '../data/quotes';

const ROTATE_MS = 12_000; // change quote every 12 seconds

/** Rotates trading quotes on an interval while the screen is mounted. */
export function useRotatingQuote(intervalMs: number = ROTATE_MS): string {
  const [index, setIndex] = useState(() => {
    const start = new Date();
    const dayStart = new Date(start.getFullYear(), 0, 0);
    const dayOfYear = Math.floor(
      (start.getTime() - dayStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    return dayOfYear % TRADING_QUOTES.length;
  });

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % TRADING_QUOTES.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return TRADING_QUOTES[index];
}
