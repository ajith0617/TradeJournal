import {create} from 'zustand';
import type {
  AppData,
  Emotion,
  RuleType,
  Segment,
  Strategy,
  Trade,
  TradingRule,
  UserProfile,
} from '../types';
import {createId} from '../utils/id';
import {todayISO} from '../utils/format';
import {deleteTradeImages, tradeImageFileName} from '../services/tradeImages';
import {createDefaultData, loadAppData, saveAppData} from '../services/storage';
import {writeFolderBackup, wipeFolderBackupAndImages} from '../services/folderBackup';
import {resolveThemeId} from '../theme';

type TradeInput = Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>;

function normalizeProfileThemeId(value: unknown) {
  return resolveThemeId(value);
}

interface JournalState extends AppData {
  hydrated: boolean;
  /** In-memory only — resets on process kill; stays true while app is backgrounded */
  appUnlocked: boolean;
  /** Fresh install and Documents/Journal backup was found */
  restoreAvailable: boolean;
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  setAppUnlocked: (unlocked: boolean) => void;
  loginSuccess: (profile: UserProfile) => void;
  logout: () => void;
  dismissRestore: () => Promise<void>;
  /** Wipe folder backup + images and seed a clean local journal. */
  startFresh: () => Promise<void>;
  restoreFromFolder: (data: AppData) => Promise<void>;

  addTrade: (input: Omit<TradeInput, 'pnl' | 'status' | 'charges' | 'reviewNotes'> & Partial<TradeInput>) => void;
  updateTrade: (id: string, input: Partial<Trade>) => void;
  /** Remove one screenshot and delete it from disk / Journal folder immediately. */
  removeTradeImage: (tradeId: string, imageRef: string) => void;
  deleteTrade: (id: string) => void;

  addRule: (type: RuleType, text: string) => void;
  updateRule: (id: string, text: string) => void;
  deleteRule: (id: string) => void;
  toggleRuleCheck: (ruleId: string) => void;

  addStrategy: (s: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateStrategy: (id: string, patch: Partial<Strategy>) => void;
  deleteStrategy: (id: string) => void;

  setProfile: (profile: Partial<UserProfile>) => void;
  replaceAll: (data: AppData) => void;
}

async function persistSlice(get: () => JournalState) {
  const {
    trades,
    rules,
    strategies,
    ruleChecks,
    profile,
    lastSyncedAt,
  } = get();
  const payload = {
    trades,
    rules,
    strategies,
    ruleChecks,
    profile,
    lastSyncedAt,
  };
  await saveAppData(payload);
  // Mirror to Documents/Journal so data can survive uninstall
  try {
    await writeFolderBackup(payload);
  } catch {
    // Local AsyncStorage still saved; folder backup may need permission
  }
}

/** Debounce disk writes so checklist toggles stay instant (stringify can be heavy). */
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(get: () => JournalState) {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistSlice(get);
  }, 350);
}

export const useJournalStore = create<JournalState>((set, get) => ({
  trades: [],
  rules: [],
  strategies: [],
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
  hydrated: false,
  appUnlocked: false,
  restoreAvailable: false,

  hydrate: async () => {
    const {data, freshInstall} = await loadAppData();
    const profile = {
      displayName: data.profile?.displayName ?? '',
      email: data.profile?.email ?? '',
      photoURL: data.profile?.photoURL,
      signedIn: Boolean(data.profile?.signedIn),
      username: data.profile?.username?.trim() || 'ajith',
      password: data.profile?.password || '123456',
      fingerprintLockEnabled: data.profile?.fingerprintLockEnabled !== false,
      themeId: normalizeProfileThemeId(
        (data.profile as {themeId?: string} | undefined)?.themeId,
      ),
    };

    let restoreAvailable = false;
    if (freshInstall) {
      try {
        const {folderBackupExists} = await import('../services/folderBackup');
        restoreAvailable = await folderBackupExists();
      } catch {
        restoreAvailable = false;
      }
      if (!restoreAvailable) {
        // No folder backup — seed local defaults now
        await saveAppData({...data, profile});
      }
    }

    const skipLock =
      profile.signedIn && profile.fingerprintLockEnabled === false;

    set({
      ...data,
      profile,
      hydrated: true,
      appUnlocked: skipLock,
      restoreAvailable,
    });
  },

  persist: async () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    await persistSlice(get);
  },

  setAppUnlocked: unlocked => set({appUnlocked: unlocked}),

  loginSuccess: profile => {
    const current = get().profile;
    set({
      profile: {
        ...current,
        ...profile,
        signedIn: true,
        username: profile.username || current.username || 'ajith',
        password: profile.password || current.password || '123456',
      },
      appUnlocked: true,
    });
    schedulePersist(get);
  },

  logout: () => {
    const p = get().profile;
    set({
      profile: {
        ...p,
        signedIn: false,
      },
      appUnlocked: false,
    });
    schedulePersist(get);
  },

  dismissRestore: async () => {
    const state = get();
    const data = {
      trades: state.trades,
      rules: state.rules,
      strategies: state.strategies,
      ruleChecks: state.ruleChecks,
      profile: state.profile,
      lastSyncedAt: state.lastSyncedAt,
    };
    await saveAppData(data);
    set({restoreAvailable: false});
  },

  startFresh: async () => {
    // Must succeed — do not reset the app if disk wipe failed
    await wipeFolderBackupAndImages();
    const defaults = createDefaultData();
    await saveAppData(defaults);
    set({
      ...defaults,
      restoreAvailable: false,
      hydrated: true,
      appUnlocked: false,
    });
  },

  restoreFromFolder: async data => {
    const migratedProfile = {
      displayName: data.profile?.displayName ?? '',
      email: data.profile?.email ?? '',
      photoURL: data.profile?.photoURL,
      signedIn: false, // require login again after reinstall
      username: data.profile?.username?.trim() || 'ajith',
      password: data.profile?.password || '123456',
      fingerprintLockEnabled:
        data.profile?.fingerprintLockEnabled !== false,
      themeId: normalizeProfileThemeId(
        (data.profile as {themeId?: string} | undefined)?.themeId,
      ),
    };
    const next = {
      ...data,
      profile: migratedProfile,
    };
    await saveAppData(next);
    // Advance UI first — don't block on folder rewrite (permissions can hang)
    set({
      ...next,
      restoreAvailable: false,
      hydrated: true,
      appUnlocked: false,
    });
    void writeFolderBackup(next).catch(() => {});
  },

  addTrade: input => {
    const now = new Date().toISOString();
    const trade: Trade = {
      id: createId(),
      date: input.date,
      stockName: input.stockName,
      segment: input.segment,
      direction: input.direction,
      quantity: input.quantity,
      entryPrice: input.entryPrice,
      stopLoss: input.stopLoss,
      targetPrice: input.targetPrice,
      reasonConditionIds: input.reasonConditionIds ?? [],
      strategyId: input.strategyId,
      conditionScore: input.conditionScore,
      conditionScoreMax: input.conditionScoreMax,
      emotion: input.emotion ?? 'Neutral',
      notes: input.notes ?? '',
      images: input.images ?? [],
      status: input.status ?? 'open',
      outcome: input.outcome,
      exitPrice: input.exitPrice,
      charges: input.charges ?? 0,
      pnl: input.pnl ?? 0,
      pnlPercent: input.pnlPercent,
      reviewNotes: input.reviewNotes ?? '',
      reviewFollowNotes: input.reviewFollowNotes ?? '',
      reviewAvoidNotes: input.reviewAvoidNotes ?? '',
      reviewedAt: input.reviewedAt,
      isPaper: Boolean(input.isPaper),
      createdAt: now,
      updatedAt: now,
    };
    set(s => ({trades: [trade, ...s.trades]}));
    schedulePersist(get);
  },

  updateTrade: (id, input) => {
    const prev = get().trades.find(t => t.id === id);
    set(s => ({
      trades: s.trades.map(t =>
        t.id === id
          ? {...t, ...input, updatedAt: new Date().toISOString()}
          : t,
      ),
    }));
    if (prev && input.images) {
      const nextNames = new Set(
        input.images.map(img => tradeImageFileName(img)),
      );
      const removed = (prev.images ?? []).filter(
        img => !nextNames.has(tradeImageFileName(img)),
      );
      if (removed.length > 0) {
        void deleteTradeImages(removed);
      }
    }
    schedulePersist(get);
  },

  removeTradeImage: (tradeId, imageRef) => {
    const name = tradeImageFileName(imageRef);
    if (!name) {
      return;
    }
    const trade = get().trades.find(t => t.id === tradeId);
    if (!trade) {
      void deleteTradeImages([name]);
      return;
    }
    const nextImages = (trade.images ?? []).filter(
      img => tradeImageFileName(img) !== name,
    );
    set(s => ({
      trades: s.trades.map(t =>
        t.id === tradeId
          ? {
              ...t,
              images: nextImages,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    }));
    void deleteTradeImages([name]);
    schedulePersist(get);
  },

  deleteTrade: id => {
    const trade = get().trades.find(t => t.id === id);
    set(s => ({trades: s.trades.filter(t => t.id !== id)}));
    if (trade?.images?.length) {
      void deleteTradeImages(trade.images);
    }
    schedulePersist(get);
  },

  addRule: (type, text) => {
    const sameType = get().rules.filter(r => r.type === type);
    const rule: TradingRule = {
      id: createId(),
      type,
      text: text.trim(),
      order: sameType.length,
      createdAt: new Date().toISOString(),
    };
    set(s => ({rules: [...s.rules, rule]}));
    schedulePersist(get);
  },

  updateRule: (id, text) => {
    set(s => ({
      rules: s.rules.map(r => (r.id === id ? {...r, text: text.trim()} : r)),
    }));
    schedulePersist(get);
  },

  deleteRule: id => {
    set(s => ({
      rules: s.rules.filter(r => r.id !== id),
      ruleChecks: s.ruleChecks.map(c => ({
        ...c,
        completedRuleIds: c.completedRuleIds.filter(x => x !== id),
      })),
    }));
    schedulePersist(get);
  },

  toggleRuleCheck: ruleId => {
    const date = todayISO();
    set(s => {
      const existing = s.ruleChecks.find(c => c.date === date);
      if (!existing) {
        return {
          ruleChecks: [
            ...s.ruleChecks,
            {date, completedRuleIds: [ruleId]},
          ],
        };
      }
      const has = existing.completedRuleIds.includes(ruleId);
      return {
        ruleChecks: s.ruleChecks.map(c =>
          c.date === date
            ? {
                ...c,
                completedRuleIds: has
                  ? c.completedRuleIds.filter(x => x !== ruleId)
                  : [...c.completedRuleIds, ruleId],
              }
            : c,
        ),
      };
    });
    schedulePersist(get);
  },

  addStrategy: input => {
    const now = new Date().toISOString();
    const strategy: Strategy = {
      ...input,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    };
    set(s => ({strategies: [strategy, ...s.strategies]}));
    schedulePersist(get);
  },

  updateStrategy: (id, patch) => {
    set(s => ({
      strategies: s.strategies.map(st =>
        st.id === id
          ? {...st, ...patch, updatedAt: new Date().toISOString()}
          : st,
      ),
    }));
    schedulePersist(get);
  },

  deleteStrategy: id => {
    set(s => ({strategies: s.strategies.filter(st => st.id !== id)}));
    schedulePersist(get);
  },

  setProfile: profile => {
    set(s => ({profile: {...s.profile, ...profile}}));
    schedulePersist(get);
  },

  replaceAll: data => {
    set({...data, hydrated: true, restoreAvailable: false, appUnlocked: false});
    schedulePersist(get);
  },
}));

export type {TradeInput, Segment, Emotion};
