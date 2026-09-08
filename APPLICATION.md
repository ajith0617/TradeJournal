# TradeJournal — Application Reference

> **For AI tools & developers:** This document is the single source of truth for understanding the TradeJournal React Native app. Read this before changing code. Paths are relative to the project root unless absolute.

---

## 1. What this app is

**TradeJournal** is a **local-first personal trading journal** for Android (and RN iOS-capable). Traders:

1. Log a trade **at entry** (stock, segment, direction, prices, strategy conditions, emotion, screenshots).
2. **Review on exit** (win/loss, exit price, charges, review notes) → P&amp;L is computed and stored.
3. Track **strategies** (conditions with weights) and **pre/post market daily reminders**.
4. View **Dashboard** stats for a date range.
5. Sign in with a **local username/password**, optional **fingerprint lock** on cold start.
6. Persist data in **AsyncStorage** and optionally **backup/restore** under `Download/Journal/` so data survives reinstall.

There is **no cloud backend** in the current codebase. Auth and data stay on device.

| Field | Value |
|--------|--------|
| Package / npm name | `journal` |
| Display name (Android) | TradeJournal |
| Version | `0.0.1` (see `package.json`) |
| React Native | `0.87.1` |
| React | `19.2.3` |
| Node engine | `>= 22.11.0` |
| Entry | `App.tsx` |

---

## 2. Tech stack

### Core
- React Native `0.87.1`, React `19.2.3`, TypeScript
- Zustand `^5` — global store (`src/store/journalStore.ts`)
- date-fns `^4` — dates / ranges
- uuid `^14` — IDs

### Navigation & UI shell
- `@react-navigation/native` + `native-stack`
- Custom **swipe tabs** in `src/navigation/RootTabs.tsx` (horizontal ScrollView pager; not relying on unrebuilt pager-view for tab switching)
- `react-native-screens`, `react-native-safe-area-context`
- `@react-navigation/bottom-tabs` / `material-top-tabs` are in package.json but **primary UX uses custom RootTabs**

### Persistence & media
- `@react-native-async-storage/async-storage` — app state
- `react-native-fs` — files / folder backup / images
- `react-native-image-picker` — pick screenshots
- `react-native-image-viewing` — full-screen image viewer

### Security
- `react-native-biometrics` — fingerprint unlock

### Native Android
- Custom module **`FolderAccess`** (`android/.../FolderAccessModule.kt`) — All files access for backup folder

### Notable absences
- No Firebase / remote API in active use
- No `react-native-reanimated` — animations use RN `Animated`

---

## 3. Bootstrap & auth gate (`App.tsx`)

Provider tree (outer → inner):

```
SafeAreaProvider
  → ThemeProvider (themeId from profile)
    → ConfirmProvider
      → AppShell (StatusBar + root bg)
        → Bootstrap
```

**Bootstrap order (exclusive gates):**

1. **Splash** — until `hydrate()` finishes **and** min **1400ms** splash (`SplashScreen`)
2. **Restore** — if `restoreAvailable` (fresh install + folder backup found) → `RestoreFromFolderScreen`
3. **Login** — if `!profile.signedIn` → `LoginScreen`
4. **Fingerprint** — if `!appUnlocked && fingerprintLockEnabled !== false` → `BiometricLockScreen`
5. Else → `NavigationContainer` + `RootTabs`

**Important behaviors:**
- `appUnlocked` is **in-memory only** — resets when the process is killed; stays true while app is backgrounded (fingerprint is **cold start**, not every resume).
- If user disables fingerprint lock, hydrate sets `appUnlocked: true` when already signed in.
- Theme follows `profile.themeId` immediately via `ThemeProvider`.

---

## 4. Navigation map

### Root tabs (`RootTabs.tsx`)
Custom swipeable tabs. **Initial / home tab: `DashboardTab`.**

| Order (L→R) | Route name | Title | Renders |
|-------------|------------|--------|---------|
| 1 | `RulesTab` | Rules | `RulesScreen` |
| 2 | `DashboardTab` | Dashboard | `DashboardStack` |
| 3 | `JournalTab` | Journal | `JournalStack` |

### Dashboard stack (`DashboardStack.tsx`)

| Screen | Params | File |
|--------|--------|------|
| `DashboardHome` | — | `src/screens/Dashboard/DashboardScreen.tsx` |
| `Profile` | — | `src/screens/Profile/ProfileScreen.tsx` |

### Journal stack (`JournalStack.tsx`)

| Screen | Params | File |
|--------|--------|------|
| `JournalList` | — | `src/screens/Journal/JournalListScreen.tsx` |
| `TradeForm` | `{ tradeId?: string }` | `src/screens/Journal/TradeFormScreen.tsx` |
| `TradeReview` | `{ tradeId: string }` | `src/screens/Journal/TradeReviewScreen.tsx` |
| `TradeDetail` | `{ tradeId: string }` | `src/screens/Journal/TradeDetailScreen.tsx` |

Auth screens are **outside** the navigator (rendered by Bootstrap only).

Param types: `src/navigation/types.ts`.

---

## 5. Screens — functionality

### Auth
| Screen | File | Role |
|--------|------|------|
| Splash | `screens/Auth/SplashScreen.tsx` | Full-bleed brand logo fade-in while hydrating |
| Restore | `screens/Auth/RestoreFromFolderScreen.tsx` | Restore from `Download/Journal/`; open All-files settings; or skip (`dismissRestore`) |
| Login | `screens/Auth/LoginScreen.tsx` | Local username/password → `loginSuccess` |
| Biometric | `screens/Auth/BiometricLockScreen.tsx` | Fingerprint prompt; password fallback; logout |

### Main
| Screen | Role |
|--------|------|
| **Dashboard** | Date range presets + custom dates; Net P&amp;L hero; avg win/loss; wins/losses counts; P&amp;L by strategy; rotating quote in header; profile avatar → Profile |
| **Profile** | Change username/password; theme picker; fingerprint toggle; folder backup now; logout. Collapsible sections. No subtitle description under title. |
| **Rules** | Collapsible **Strategies** (default open) CRUD modal; collapsible **Daily reminders** / Trade Checklist (default closed) with Pre/Post tabs + daily checkboxes |
| **Journal list** | Filters All / Not reviewed / Reviewed / Wins / Losses; trade cards; **FAB +** bottom-right to add trade (no header +Trade button) |
| **Trade form** | Create or edit **entry** (open trade). Strategy conditions multi-select, emotion, images |
| **Trade detail** | View trade; Edit; Exit & review / Edit review; Delete (themed confirm) |
| **Trade review** | Win/Loss, exit price, charges, review notes; live P&amp;L preview; saves as `status: 'reviewed'` |

---

## 6. Domain model (`src/types/index.ts`)

### Enums / unions
- `Segment`: `'Equity' | 'F&O'`
- `Direction`: `'Buy' | 'Sell'`
- `Emotion`: `'Calm' | 'Confident' | 'FOMO' | 'Revenge' | 'Anxious' | 'Greedy' | 'Over trade' | 'Neutral'`
- `RuleType`: `'pre' | 'post'`
- `TradeStatus`: `'open' | 'reviewed'`
- `TradeOutcome`: `'win' | 'loss'`
- `ConditionWeight`: `'core' | 'secondary' | 'minor'` (labels: Core / Secondary / Minor)

### `Trade` (key fields)
`id`, `date` (YYYY-MM-DD), `stockName`, `segment`, `direction`, `quantity`, `entryPrice`, `stopLoss?`, `targetPrice?`, `reasonConditionIds[]`, `strategyId?`, `emotion`, `notes`, `images[]` (filenames), `status`, `outcome?`, `exitPrice?`, `charges`, `pnl`, `reviewNotes`, `reviewedAt?`, `createdAt`, `updatedAt`

### Other entities
- **`Strategy`**: name, description, `conditions[]` (`id`, `text`, `weight`)
- **`TradingRule`**: `type` pre/post, `text`, `order`
- **`RuleCheckState`**: `{ date, completedRuleIds[] }` — daily checklist progress
- **`UserProfile`**: `displayName`, `email`, `photoURL?`, `signedIn`, `username`, `password`, `fingerprintLockEnabled`, `themeId`
- **`AppData`**: `trades`, `rules`, `strategies`, `ruleChecks`, `profile`, `lastSyncedAt?`

### P&amp;L (`src/utils/format.ts` → `calcPnl`)
Computed on review from direction, entry, exit, quantity, charges (INR formatting via `formatINR` / `formatSignedINR`).

Dashboard stats (`src/utils/stats.ts`) use **reviewed** trades only for win rate / net P&amp;L (open trades do not skew rates). Open count is shown separately.

---

## 7. Zustand store (`src/store/journalStore.ts`)

### Persisted state (= `AppData`)
`trades`, `rules`, `strategies`, `ruleChecks`, `profile`, `lastSyncedAt?`

### Ephemeral
- `hydrated`, `appUnlocked`, `restoreAvailable`

### Actions (non-exhaustive but complete for features)
`hydrate`, `persist`, `setAppUnlocked`, `loginSuccess`, `logout`, `dismissRestore`, `restoreFromFolder`, `addTrade`, `updateTrade`, `deleteTrade`, `addRule`, `updateRule`, `deleteRule`, `toggleRuleCheck`, `addStrategy`, `updateStrategy`, `deleteStrategy`, `setProfile`, `replaceAll`

**Persist:** debounced ~350ms → AsyncStorage + best-effort folder backup write.

### Defaults
- Username `ajith` / password `123456`
- `fingerprintLockEnabled: true`, `themeId: 'dark'`, `signedIn: false`
- Seeded rules + one sample strategy on first data create (`src/services/storage.ts`)

---

## 8. Services

| File | Responsibility |
|------|----------------|
| `src/services/storage.ts` | AsyncStorage key `@journal/app_data_v1`; `createDefaultData`, `loadAppData`, `saveAppData`, `migrateAppData` (legacy trade/strategy shapes, image filenames) |
| `src/services/folderBackup.ts` | Write/read `journal-data.json` + `images/` under Download/Journal; Android permissions; FolderAccess |
| `src/services/tradeImages.ts` | Persist gallery URIs into app docs `trade-images/`; portable filenames in JSON |
| `src/services/auth.ts` | `verifyLocalCredentials`, `buildSignedInProfile`, username/password validators |
| `src/services/biometrics.ts` | Availability check + fingerprint prompt |

### Persistence locations
| Store | Location |
|-------|----------|
| Primary app data | AsyncStorage `@journal/app_data_v1` |
| Trade images (app) | `{DocumentDirectory}/trade-images/` |
| Folder backup (user-facing) | `Download/Journal/journal-data.json` + `Download/Journal/images/` |
| Backup envelope | `{ version: 2, savedAt, data }` |

---

## 9. Theme system (`src/theme/`)

**Theme IDs:** `dark` | `light` | `ocean` | `slate` (default `dark`)

| ID | Feel |
|----|------|
| dark | Charcoal + mint accent (original) |
| light | Bright surfaces + green |
| ocean | Deep navy + cyan |
| slate | Cool gray + blue |

- Palettes: `colors.ts` (`THEMES`, `THEME_OPTIONS`, `resolveThemeId`)
- Runtime: `ThemeContext.tsx` → `ThemeProvider`, `useTheme()`, `useThemedStyles(factory)`
- Spacing / radius: `spacing.ts`
- Typography factory: `createTypography(palette)` in `typography.ts`
- Change theme: Profile → Appearance → `setProfile({ themeId })`
- UI must use **`useTheme` / `useThemedStyles`**, not static colors (StyleSheets capture values at create time).

Confirm dialogs, chips, FAB, StatusBar (`light-content` / `dark-content`) all follow theme.

---

## 10. Feature specifics

### Dashboard date range
Presets: **Day** | **Week** | **Month** | **3 Month** | optional **Custom dates**.

| Preset | Range |
|--------|--------|
| Day | today → today |
| Week | last 7 days (`subDays(now, 6)` → today) |
| Month | same calendar date 1 month ago → today (`subMonths(now, 1)`) |
| 3 Month | same calendar date 3 months ago → today |
| Custom | From/To `DateField`; invalid if from > to |

Default preset: **Month**. Header subtitle: **rotating trading quotes** (`useRotatingQuote` / `src/data/quotes.ts`).

### Journal filters
| Filter | Meaning |
|--------|---------|
| All | All trades; header uses rotating quote |
| Not reviewed | `status === 'open'` |
| Reviewed | `status === 'reviewed'` |
| Wins | reviewed && `pnl > 0` |
| Losses | reviewed && `pnl < 0` |

FAB bottom-right opens `TradeForm` for a new trade.

### Rules
- **Strategies** section: collapsible, **default open**
- **Daily reminders**: collapsible, **default closed**; Pre-market / Post-market chips; checklist persists per calendar day

### Profile
Collapsible: Username & password | Appearance | Security & backup. Logout uses themed confirm. No header description line.

### Confirmations
Do **not** use `Alert.alert` for confirms. Use `useConfirm()` from `ConfirmProvider`:
- `confirm({ title, message, tone: 'danger', confirmLabel })` → Promise&lt;boolean&gt;
- `notice({ title, message, tone: 'success' | 'warning' | 'danger' })` → single OK

---

## 11. Key components (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `SafeScreen` | Safe-area padding + themed bg |
| `ScreenHeader` | Title + animated `DynamicDescription` subtitle + optional right |
| `DynamicDescription` | Accent-rail animated header subtitle only |
| `Button` | primary / secondary / ghost / danger |
| `Input`, `FieldLabel`, `DateField`, `SegmentedControl` | Forms |
| `TradeCard`, `TradeImage`, `ScreenshotGallery` | Journal media & cards |
| `EmptyState` | Empty lists + CTA |
| `ContextFilterChip` | Themed filter/preset chips |
| `FabButton` | Circular + FAB |
| `FadeSlideIn`, `ScalePop`, `PulseGlow` | Motion helpers |
| `ConfirmModal` + `ConfirmProvider` | Themed dialogs |
| `TabGlyph` | Tab icons |

Motion tokens: `src/animation/tokens.ts`.

---

## 12. Default credentials

| Field | Default |
|-------|---------|
| Username | `ajith` (case-insensitive login) |
| Password | `123456` |
| Display name after login | `Ajith` |
| Email shape | `{username}@local` |

Restore-from-folder sets `signedIn: false` so user must log in again after restore.

---

## 13. Source tree (`src/`)

```
src/
├── animation/tokens.ts
├── assets/ (app_icon.png, brand_logo.png)
├── components/   (shared UI — see §11)
├── data/quotes.ts
├── hooks/useRotatingQuote.ts
├── navigation/   (RootTabs, stacks, types)
├── screens/
│   ├── Auth/     (Splash, Restore, Login, Biometric)
│   ├── Dashboard/
│   ├── Journal/  (List, Form, Detail, Review)
│   ├── Profile/
│   └── Rules/
├── services/     (storage, folderBackup, tradeImages, auth, biometrics)
├── store/journalStore.ts
├── theme/        (colors, ThemeContext, spacing, typography)
├── types/index.ts
└── utils/        (format, id, stats)
```

Root: `App.tsx`, `package.json`, `android/`, `ios/`.

---

## 14. Conventions for future changes

1. **Local-first** — do not assume a server unless explicitly adding one.
2. **Themes** — always `useTheme` / `useThemedStyles` for colors/typography.
3. **Confirms** — `useConfirm()`, not system `Alert`.
4. **Images** — persist via `tradeImages` service; store filenames in trade JSON, not temporary gallery URIs.
5. **Fingerprint** — cold start only; respect `fingerprintLockEnabled`.
6. **Trade lifecycle** — entry → `open`; after review → `reviewed` with `outcome`, `exitPrice`, `charges`, `pnl`.
7. **Dashboard stats** — reviewed trades drive P&amp;L/win rate; keep open trades out of those aggregates.
8. **Backup** — keep AsyncStorage + folder backup in sync when changing `AppData` shape; extend `migrateAppData` for breaking changes.
9. **Tabs** — Dashboard is home; Rules left, Journal right of Dashboard in swipe order.
10. Prefer existing components (`Button`, `DateField`, `FabButton`, chips) over one-off UI.

---

## 15. Scripts

```bash
npm start          # Metro
npm run android    # Run Android
npm run ios        # Run iOS
npm run lint
npm test
```

Require Node `>= 22.11.0`.

---

## 16. Quick mental model

```
Cold start
  → Splash + hydrate AsyncStorage
  → (optional) Restore from Download/Journal
  → Login (local)
  → (optional) Fingerprint
  → Tabs: Rules | Dashboard* | Journal
       Dashboard → stats + Profile
       Journal → list/FAB → Form / Detail / Review
       Rules → Strategies + Daily checklist
```

`*` = default tab.

---

*Generated as a living app map for TradeJournal. Update this file when navigation, data model, or auth flow changes.*
