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

/** Condition priority inside a strategy */
export type ConditionWeight = 'core' | 'secondary' | 'minor';


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
  {value: 'core', label: 'Core'},
  {value: 'secondary', label: 'Secondary'},
  {value: 'minor', label: 'Minor'},
];

export function conditionWeightLabel(weight: ConditionWeight): string {
  return (
    CONDITION_WEIGHT_OPTIONS.find(o => o.value === weight)?.label ?? 'Core'
  );
}
