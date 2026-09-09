import {format, subDays, subMonths} from 'date-fns';

export type RangePreset = 'day' | 'week' | 'month' | '3m' | 'custom';

export const DATE_RANGE_PRESETS: {
  id: Exclude<RangePreset, 'custom'>;
  label: string;
}[] = [
  {id: 'day', label: 'Day'},
  {id: 'week', label: 'Week'},
  {id: 'month', label: 'Month'},
  {id: '3m', label: '3 Month'},
];

export function rangeForPreset(
  preset: Exclude<RangePreset, 'custom'>,
): {from: string; to: string} {
  const now = new Date();
  const to = format(now, 'yyyy-MM-dd');
  switch (preset) {
    case 'day':
      return {from: to, to};
    case 'week':
      return {from: format(subDays(now, 6), 'yyyy-MM-dd'), to};
    case 'month':
      return {from: format(subMonths(now, 1), 'yyyy-MM-dd'), to};
    case '3m':
      return {from: format(subMonths(now, 3), 'yyyy-MM-dd'), to};
  }
}
