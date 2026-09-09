export type Segment = 'Equity' | 'F&O';
export type Direction = 'Buy' | 'Sell';
export type Emotion =
  | 'Calm'
  | 'Confident'
  | 'FOMO'
  | 'Revenge'
  | 'Anxious'
  | 'Greedy'
  | 'Over trade'
  | 'Neutral';

export type RuleType = 'pre' | 'post';

/** open = taken but not exited/reviewed; reviewed = closed with review */
export type TradeStatus = 'open' | 'reviewed';

export type TradeOutcome = 'win' | 'loss';

/** Condition priority inside a strategy — Core = 2 marks, Minor = 1 mark */
export type ConditionWeight = 'core' | 'minor';


export interface Trade {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  stockName: string;
  segment: Segment;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  stopLoss?: number;
  targetPrice?: number;
  /** Strategy condition ids selected as reasons to take the trade */
  reasonConditionIds: string[];
  strategyId?: string;
  /**
   * Setup quality marks from selected conditions at entry
   * (Core = 2, Minor = 1). Snapshot so history stays stable.
   */
  conditionScore?: number;
  /** Max possible marks for the strategy conditions at entry */
  conditionScoreMax?: number;
  /**
   * P&L % vs traded amount (entry × qty), saved at review.
   * Example: traded ₹10,000 and profit ₹250 → 2.5
   */
  pnlPercent?: number;
  emotion: Emotion;
  /** Notes at entry (why you took it) */
  notes: string;
  images: string[];
  status: TradeStatus;
  /** win / loss result */
  outcome?: TradeOutcome;
  /** Actual or derived exit (manual exit, else target/SL) */
  exitPrice?: number;
  charges: number;
  pnl: number;
  /** How to improve */
  reviewNotes: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradingRule {
  id: string;
  type: RuleType;
  text: string;
  order: number;
  createdAt: string;
}

export interface StrategyCondition {
  id: string;
  text: string;
  weight: ConditionWeight;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  conditions: StrategyCondition[];
  createdAt: string;
  updatedAt: string;
}

export interface RuleCheckState {
  date: string; // YYYY-MM-DD
  completedRuleIds: string[];
}

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  signedIn: boolean;
  /** Local login username (default ajith) */
  username: string;
  /** Local login password — stored on device only */
  password: string;
  /** When true, fingerprint lock is required after cold start */
  fingerprintLockEnabled: boolean;
  /** App color theme (dark | light | ocean | slate) */
  themeId: 'dark' | 'light' | 'ocean' | 'slate';
}

export interface AppData {
  trades: Trade[];
  rules: TradingRule[];
  strategies: Strategy[];
  ruleChecks: RuleCheckState[];
  profile: UserProfile;
  lastSyncedAt?: string;
}

export const CONDITION_WEIGHT_OPTIONS: {
  value: ConditionWeight;
  label: string;
}[] = [
  {value: 'core', label: 'Core · 2'},
  {value: 'minor', label: 'Minor · 1'},
];

export function conditionWeightLabel(weight: ConditionWeight): string {
  return weight === 'minor' ? 'Minor' : 'Core';
}

/** Marks awarded when a condition is selected on a trade. */
export function conditionWeightMarks(weight: ConditionWeight): number {
  return weight === 'core' ? 2 : 1;
}

export function normalizeConditionWeight(value: unknown): ConditionWeight {
  if (value === 'minor' || value === 'contextual' || value === 'filter') {
    return 'minor';
  }
  // Legacy "secondary" / supporting → treat as core (higher bar)
  return 'core';
}

/** Score selected strategy conditions (and optional max for that strategy). */
export function scoreTradeConditions(
  conditions: StrategyCondition[],
  selectedIds: string[],
): {score: number; max: number} {
  const selected = new Set(selectedIds);
  let score = 0;
  let max = 0;
  for (const c of conditions) {
    const marks = conditionWeightMarks(c.weight);
    max += marks;
    if (selected.has(c.id)) {
      score += marks;
    }
  }
  return {score, max};
}
