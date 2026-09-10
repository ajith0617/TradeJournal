import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AppData, Trade} from '../types';
import {normalizeConditionWeight} from '../types';
import {tradeImageFileName} from './tradeImages';
import {resolveThemeId} from '../theme';
import {createId} from '../utils/id';
import {calcPnlPercent} from '../utils/format';
import {format as formatDate, parseISO, isValid} from 'date-fns';

const STORAGE_KEY = '@journal/app_data_v1';

export const defaultRules = (): AppData['rules'] => [
  {
    id: createId(),
    type: 'pre',
    text: 'Check economic calendar / news',
    order: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: createId(),
    type: 'pre',
    text: 'Risk per trade ≤ 1% of capital',
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: createId(),
    type: 'pre',
    text: 'Only take planned setups',
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: createId(),
    type: 'post',
    text: 'Log every trade in the journal',
    order: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: createId(),
    type: 'post',
    text: 'Review mistakes without blame',
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: createId(),
    type: 'post',
    text: 'Mark rules followed / broken',
    order: 2,
    createdAt: new Date().toISOString(),
  },
];

export const defaultStrategies = (): AppData['strategies'] => [
  {
    id: createId(),
    name: 'Opening Range Breakout',
    description: 'Trade break of first 15-min range with volume confirmation.',
    conditions: [
      {
        id: createId(),
        text: 'Clear OR high/low',
        weight: 'core',
      },
      {
        id: createId(),
        text: 'Volume expansion on break',
        weight: 'core',
      },
      {
        id: createId(),
        text: 'Risk defined below OR',
        weight: 'minor',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function createDefaultData(): AppData {
  return {
    trades: [],
    rules: defaultRules(),
    strategies: defaultStrategies(),
    ruleChecks: [],
    profile: {
      displayName: '',
      email: '',
      signedIn: false,
      username: 'ajith',
      password: '123456',
      fingerprintLockEnabled: true,
      themeId: 'ocean',
    },
  };
}

export type LoadResult = {
  data: AppData;
  /** True when AsyncStorage was empty (new install / after uninstall) */
  freshInstall: boolean;
};

export async function loadAppData(): Promise<LoadResult> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Do not write defaults yet — caller may restore from Documents/Journal first
      return {data: createDefaultData(), freshInstall: true};
    }
    const parsed = JSON.parse(raw) as AppData;
    const migrated = migrateAppData(parsed);
    if (migrated !== parsed) {
      await saveAppData(migrated);
    }
    return {data: migrated, freshInstall: false};
  } catch {
    return {data: createDefaultData(), freshInstall: true};
  }
}

/** Normalize older trade / strategy shapes to current model */
export function migrateAppDataForBackup(data: AppData): AppData {
  return migrateAppData(data);
}

/** Normalize older trade / strategy shapes to current model */
function migrateAppData(data: AppData): AppData {
  const strategies = (data.strategies ?? []).map(s => ({
    ...s,
    conditions: (s.conditions ?? []).map(c => {
      const anyC = c as {
        weight?: string;
        requirement?: string;
        id: string;
        text: string;
      };
      // optional / contextual → minor; everything else (incl. legacy secondary) → core
      const weight =
        anyC.requirement === 'optional' ||
        anyC.weight === 'minor' ||
        anyC.weight === 'contextual' ||
        anyC.weight === 'filter'
          ? normalizeConditionWeight('minor')
          : normalizeConditionWeight(anyC.weight ?? 'core');
      return {id: anyC.id, text: anyC.text, weight};
    }),
  }));

  const trades = (data.trades ?? []).map(t => {
    const anyT = t as Trade & {
      symbol?: string;
      reasonRuleIds?: string[];
      reasonConditionIds?: string[];
    };
    const stockName = anyT.stockName || anyT.symbol || '';
    const status =
      anyT.status ??
      (anyT.exitPrice != null && anyT.exitPrice > 0 ? 'reviewed' : 'open');
    let outcome = anyT.outcome;
    if (!outcome && status === 'reviewed' && anyT.pnl != null) {
      outcome = anyT.pnl >= 0 ? 'win' : 'loss';
    }
    return {
      ...anyT,
      stockName,
      reasonConditionIds:
        anyT.reasonConditionIds ?? anyT.reasonRuleIds ?? [],
      stopLoss: anyT.stopLoss,
      targetPrice: anyT.targetPrice,
      status,
      outcome,
      exitPrice: anyT.exitPrice,
      exitDate:
        anyT.exitDate ||
        (status === 'reviewed' && anyT.reviewedAt
          ? (() => {
              try {
                const d = parseISO(anyT.reviewedAt);
                return isValid(d) ? formatDate(d, 'yyyy-MM-dd') : undefined;
              } catch {
                return undefined;
              }
            })()
          : undefined),
      charges: anyT.charges ?? 0,
      pnl: anyT.pnl ?? 0,
      pnlPercent:
        anyT.pnlPercent ??
        (status === 'reviewed'
          ? calcPnlPercent(
              anyT.pnl ?? 0,
              anyT.entryPrice,
              anyT.quantity,
            ) ?? undefined
          : undefined),
      reviewNotes: anyT.reviewNotes ?? '',
      images: (anyT.images ?? []).map((img: string) => tradeImageFileName(img)),
      notes: anyT.notes ?? '',
      emotion: anyT.emotion ?? 'Neutral',
      isPaper: Boolean(anyT.isPaper),
    } as Trade;
  });

  const profile = {
    displayName: data.profile?.displayName ?? '',
    email: data.profile?.email ?? '',
    photoURL: data.profile?.photoURL,
    signedIn: data.profile?.signedIn ?? false,
    username: data.profile?.username?.trim() || 'ajith',
    password: data.profile?.password || '123456',
    fingerprintLockEnabled: data.profile?.fingerprintLockEnabled !== false,
    themeId: resolveThemeId(
      (data.profile as {themeId?: string} | undefined)?.themeId,
    ),
  };

  return {...data, strategies, trades, profile};
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
