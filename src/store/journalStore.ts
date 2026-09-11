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
import {wipeFolderBackupAndImages} from '../services/folderBackup';
import {resolveThemeId} from '../theme';

type TradeInput = Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>;

function normalizeProfileThemeId(value: unknown) {
  return resolveThemeId(value);
}

interface JournalState extends AppData {
  hydrated: boolean;
  /** In-memory only — resets on process kill; stays true while app is backgrounded */
  appUnlocked: boolean;
  /** @deprecated Cold-start restore gate removed — restore is Profile-only */
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
  /** Profile: load Documents/Journal JSON + images; keep current session */
  restoreFromFolderManual: () => Promise<{
    tradeCount: number;
    strategyCount: number;
    ruleCount: number;
  }>;

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
  const state = get();
  const {
    trades,
    rules,
    strategies,
    ruleChecks,
    profile,
    lastSyncedAt,
  } = state;
  const payload = {
    trades,
    rules,
    strategies,
    ruleChecks,
    profile,
    lastSyncedAt,
  };
  // Local AsyncStorage only — Documents/Journal updates on Profile → Backup now
  await saveAppData(payload);
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

    // Restore is Profile-only — always seed local store on fresh install.
    // Folder backup is manual (Profile → Backup now) and will not auto-overwrite.
    if (freshInstall) {
      await saveAppData({...data, profile});
    }

    const skipLock =
      profile.signedIn && profile.fingerprintLockEnabled === false;

    set({
      ...data,
      profile,
      hydrated: true,
      appUnlocked: skipLock,
      restoreAvailable: false,
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
    // Seed empty local journal only — never mirror to Documents/Journal here.
    const defaults = createDefaultData();
    const profile = {
      ...defaults.profile,
      ...get().profile,
      signedIn: false,
    };
    const next = {...defaults, profile};
    await saveAppData(next);
    set({
      ...next,
      restoreAvailable: false,
      hydrated: true,
      appUnlocked: false,
    });
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
    const current = get().profile;
    const keepSession = Boolean(current.signedIn);
    const migratedProfile = {
      displayName: data.profile?.displayName || current.displayName || '',
      email: data.profile?.email || current.email || '',
      photoURL: data.profile?.photoURL || current.photoURL,
      signedIn: keepSession,
      username:
        (keepSession ? current.username : data.profile?.username)?.trim() ||
        'ajith',
      password:
        (keepSession ? current.password : data.profile?.password) || '123456',
      fingerprintLockEnabled:
        current.fingerprintLockEnabled !== false &&
        data.profile?.fingerprintLockEnabled !== false,
      themeId: normalizeProfileThemeId(
        data.profile?.themeId ?? current.themeId,
      ),
    };
    const next = {
      ...data,
      trades: data.trades ?? [],
      rules: data.rules ?? [],
      strategies: data.strategies ?? [],
      ruleChecks: data.ruleChecks ?? [],
      profile: migratedProfile,
    };
    await saveAppData(next);
    set({
      ...next,
      restoreAvailable: false,
      hydrated: true,
      appUnlocked: keepSession ? true : false,
    });
  },

  restoreFromFolderManual: async () => {
    const {readFolderBackup} = await import('../services/folderBackup');
    const data = await readFolderBackup();
    await get().restoreFromFolder(data);
    return {
      tradeCount: data.trades?.length ?? 0,
      strategyCount: data.strategies?.length ?? 0,
      ruleCount: data.rules?.length ?? 0,
    };
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
