# TradeJournal — Application Reference

> **For AI tools & developers:** This document is the single source of truth for understanding the TradeJournal React Native app. Read this before changing code. Paths are relative to the project root unless absolute.

---

## 1. What this app is

**TradeJournal** is a **local-first personal trading journal** for Android (and RN iOS-capable). Traders:

1. Log a trade **at entry** (stock, segment, direction, **entry date**, prices, strategy conditions with marks, emotion, screenshots).
2. **Review on exit** (win/loss, **exit date**, exit price, charges, review notes) → P&amp;L ₹ and **P&amp;L %** are computed and stored; **days held** is derived from entry → exit.
3. Optionally keep **Paper trades** (practice) in an isolated journal list — never counted on Dashboard.
4. Track **strategies** (conditions: **Core = 2 marks**, **Minor = 1 mark**) and **pre/post market daily reminders**.
5. View **Dashboard** stats for a date range (net P&amp;L, %, traded amount, by strategy) — **live trades only**.
6. Sign in with a **local username/password** (password **show/hide**), optional **fingerprint lock** on cold start.
7. Persist data in **AsyncStorage**. **Manual** backup/restore under `Documents/Journal/` via Profile (Backup now / Restore from folder). No live folder sync.

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
| GitHub | `https://github.com/ajith0617/TradeJournal.git` (`main`) |

---

## 2. Tech stack

### Core
- React Native `0.87.1`, React `19.2.3`, TypeScript
- Zustand `^5` — global store (`src/store/journalStore.ts`)
- date-fns `^4` — dates / ranges / hold days
- uuid `^14` — IDs

### Navigation & UI shell
- `@react-navigation/native` + `native-stack`
- Custom **swipe tabs** in `src/navigation/RootTabs.tsx` (horizontal ScrollView pager)
- `react-native-screens`, `react-native-safe-area-context`
- `@react-navigation/bottom-tabs` / `material-top-tabs` are in package.json but **primary UX uses custom RootTabs**

### Persistence & media
- `@react-native-async-storage/async-storage` — app state
- `react-native-fs` — files / folder backup / images
- `react-native-image-picker` — pick screenshots
- `react-native-image-viewing` — full-screen image viewer (**delete image only from viewer**)

### Security
- `react-native-biometrics` — fingerprint unlock

### Native Android
- Custom module **`FolderAccess`** (`android/app/src/main/java/com/journal/FolderAccessModule.kt`):
  - `hasAllFilesAccess` / `openAllFilesAccessSettings`
  - `wipeJournalBackup` — recursive delete of Documents/Journal (and mirrors)
  - `deleteJournalImages(names[])` — delete specific files under Journal/images

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

1. **Splash** — until `hydrate()` finishes **and** min splash (`SplashScreen`)
2. **Login** — if `!profile.signedIn` → `LoginScreen`
3. **Fingerprint** — if `!appUnlocked && fingerprintLockEnabled !== false` → `BiometricLockScreen`
4. Else → `NavigationContainer` + `RootTabs`

**Important behaviors:**
- `appUnlocked` is **in-memory only** — resets when the process is killed; stays true while app is backgrounded (fingerprint is **cold start**, not every resume).
- If user disables fingerprint lock, hydrate sets `appUnlocked: true` when already signed in.
- Theme follows `profile.themeId` immediately via `ThemeProvider`.

### Restore from Profile (not at login)
- After install → login → **Profile → Security & backup → Restore from folder**
- Requires All files access; reads `Documents/Journal/journal-data.json` (+ images/) and restores screenshots into the app. Download/Journal is a legacy fallback only.
- Keeps the current login session; replaces trades / rules / strategies in the app

### Backup now (Profile only — no live sync)
- **Profile → Backup now** writes `Documents/Journal/journal-data.json` and syncs `images/` to match the app (copies current screenshots, deletes orphans).
- Day-to-day saves update **AsyncStorage only**; the Journal folder is not live-synced.

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
| `TradeForm` | `{ tradeId?: string; isPaper?: boolean }` | `src/screens/Journal/TradeFormScreen.tsx` |
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
| Login | `screens/Auth/LoginScreen.tsx` | Local username/password + **eye toggle**; → `loginSuccess` |
| Biometric | `screens/Auth/BiometricLockScreen.tsx` | Fingerprint; password fallback + eye toggle; logout |

### Main
| Screen | Role |
|--------|------|
| **Dashboard** | Shared date presets (Day/Week/Month/3M + custom); Net P&amp;L ₹ + **%** + **traded amount** (**live trades only**); avg win/loss; wins/losses; P&amp;L + % by strategy; **tap rotating quote** for next; profile avatar → Profile |
| Profile | Username/password (eye toggles); theme picker; fingerprint; **Backup now** / **Restore from folder**; logout |
| **Rules** | Collapsible Strategies panel (opens by default when tab focused) — tap strategy to expand conditions; **⋯** popover for Edit / Copy / Delete; CRUD modal (**Mandatory type**: Core · 2 / Minor · 1); collapsible Trade Checklist (default closed); **tap quote** for next |
| **Journal list** | Compact **date pill** + muted **Paper** entry (header); live chips All / Not reviewed / Reviewed / Wins / Losses; Wins/Losses optional **P&amp;L Low→High / High→Low** (default take-order); **Paper trade** mode via header (isolated list, ← Live journal to exit); FAB + |
| **Trade form** | Create/edit entry; **Entry date**; strategy conditions + live **Setup mark**; screenshots; paper mode title when `isPaper` |
| **Trade detail** | Hero P&amp;L; collapsible **Trade details** (SL/Target show ₹ risk/reward on same line); collapsible **Notes & screenshots** with separate **What to follow** / **What not to follow** after exit; paper badge in status |
| **Trade review** | Win/Loss; **Exit date** (required, ≥ entry); exit price; charges; two lesson cards — **What to follow (good)** and **What not to follow (bad)**; live P&amp;L ₹/% + traded amount |

Forms (trade / review / strategy modal / profile) use **keyboard avoiding**.

---

## 6. Domain model (`src/types/index.ts`)

### Enums / unions
- `Segment`: `'Equity' | 'F&O'`
- `Direction`: `'Buy' | 'Sell'`
- `Emotion`: `'Calm' | 'Confident' | 'FOMO' | 'Revenge' | 'Anxious' | 'Greedy' | 'Over trade' | 'Neutral'`
- `RuleType`: `'pre' | 'post'`
- `TradeStatus`: `'open' | 'reviewed'`
- `TradeOutcome`: `'win' | 'loss'`
- `ConditionWeight`: **`'core' | 'minor'` only** (legacy `secondary` migrates → `core`)
  - Core = **2** marks, Minor = **1** mark (`conditionWeightMarks`, `scoreTradeConditions`)

### `Trade` (key fields)
| Field | Notes |
|-------|--------|
| `date` | **Entry date** YYYY-MM-DD |
| `exitDate?` | **Exit date** YYYY-MM-DD (set on review) |
| `reasonConditionIds[]` | Selected strategy conditions |
| `conditionScore?` / `conditionScoreMax?` | Setup marks snapshot at save |
| `pnl` | Net ₹ after charges |
| `pnlPercent?` | `(pnl / (entry × qty)) × 100`, saved on review |
| `images[]` | Portable filenames under `trade-images/` |
| `notes` | Entry notes |
| `reviewFollowNotes?` | After exit — **what to follow** (good habits) |
| `reviewAvoidNotes?` | After exit — **what not to follow** (mistakes) |
| `reviewNotes` | Legacy combined after-exit text; migrated into follow when split fields missing; kept in sync on review save |
| `status` / `outcome?` / `exitPrice?` / `charges` / `reviewedAt?` | Review lifecycle |
| `isPaper?` | `true` = **paper / practice** trade; omitted/`false` = live. Migrated via `Boolean(isPaper)` |

### Other entities
- **`Strategy`**: name, description, `conditions[]` (`id`, `text`, `weight`)
- **`TradingRule`**: `type` pre/post, `text`, `order`
- **`RuleCheckState`**: `{ date, completedRuleIds[] }`
- **`UserProfile`**: includes `themeId`: `light` \| `ocean` (legacy `dark`/`slate` → `ocean`)
- **`AppData`**: `trades`, `rules`, `strategies`, `ruleChecks`, `profile`, `lastSyncedAt?` — paper and live share one `trades[]`

### Money & duration helpers (`src/utils/format.ts`)
- `calcPnl`, `calcTradedAmount`, `calcPnlPercent`, `formatSignedPercent`
- `calcTradeHoldDays(entry, exit)`, `formatHoldDays` → `Same day` / `1 day` / `N days`

### Stats (`src/utils/stats.ts`)
- `isPaperTrade` / `isLiveTrade`
- `computeStats` / `pnlByStrategy` use **reviewed live** trades only (paper excluded)
- Dashboard date filter also `.filter(isLiveTrade)` before stats

### Shared date ranges (`src/utils/dateRange.ts`)
`DATE_RANGE_PRESETS`, `rangeForPreset`, `RangePreset` — used by **Dashboard** and **Journal list**.

---

## 7. Zustand store (`src/store/journalStore.ts`)

### Persisted state (= `AppData`)
`trades`, `rules`, `strategies`, `ruleChecks`, `profile`, `lastSyncedAt?`

### Ephemeral
- `hydrated`, `appUnlocked`, `restoreAvailable`

### Actions (feature-complete)
`hydrate`, `persist`, `setAppUnlocked`, `loginSuccess`, `logout`, `dismissRestore`, **`startFresh`**, `restoreFromFolder`, **`restoreFromFolderManual`**, `addTrade`, `updateTrade`, **`removeTradeImage`**, `deleteTrade`, rule/strategy CRUD, `toggleRuleCheck`, `setProfile`, `replaceAll`

**Persist:** debounced ~350ms → AsyncStorage only (folder backup is manual via Profile).

**Image cleanup:**
- `removeTradeImage` / `updateTrade` (removed images) / `deleteTrade` → `deleteTradeImages` (app dir + Journal/images, native when available)
- `startFresh` → `wipeFolderBackupAndImages` then defaults

### Defaults
- Username `ajith` / password `123456`
- `fingerprintLockEnabled: true`, `themeId: 'ocean'`, `signedIn: false`
- Seeded rules + sample strategy (`storage.ts`)

---

## 8. Services

| File | Responsibility |
|------|----------------|
| `src/services/storage.ts` | AsyncStorage `@journal/app_data_v1`; defaults; `migrateAppData` (weights, `pnlPercent`, `exitDate`, **`isPaper`**, image filenames) |
| `src/services/folderBackup.ts` | Write/read backup; **`wipeFolderBackupAndImages`** (requires All files access; verifies wipe) |
| `src/services/tradeImages.ts` | Persist / display / backup / restore; **`deleteTradeImages`**, `clearLocalTradeImages`, `clearJournalFolderImages` |
| `src/services/auth.ts` | Credentials + username/password validators |
| `src/services/biometrics.ts` | Fingerprint |

### Persistence locations
| Store | Location |
|-------|----------|
| Primary app data | AsyncStorage `@journal/app_data_v1` |
| Trade images (app) | `{DocumentDirectory}/trade-images/` |
| Folder backup | `Documents/Journal/journal-data.json` + `Documents/Journal/images/` |
| Backup envelope | `{ version: 2, savedAt, data }` |

---

## 9. Theme system (`src/theme/`)

**Theme IDs:** `light` | `ocean` (default `ocean`)

| ID | Feel |
|----|------|
| light | Bright surfaces + ocean cyan accent |
| ocean | Soft navy dusk + cyan |

- Palettes: `colors.ts`; runtime: `ThemeContext` / `useTheme` / `useThemedStyles`
- Spacing / radius: `spacing.ts`; typography: `createTypography`
- Change theme: Profile → Appearance → `setProfile({ themeId })`
- Always use theme hooks — do not bake static colors into StyleSheets

---

## 10. Feature specifics

### Date range (Dashboard + Journal)
Shared helpers in `src/utils/dateRange.ts`.

| Preset | Range |
|--------|--------|
| Day | today → today |
| Week | last 7 days (`subDays(now, 6)` → today) |
| Month | `subMonths(now, 1)` → today |
| 3 Month | `subMonths(now, 3)` → today |
| Custom | From/To `DateField`; invalid if from > to |

Default: **Month**.

**Journal UX:** date control is a **header pill** (e.g. `Month` or `12 Aug – 9 Sep`) opening a **bottom sheet**. Muted **Paper** text beside the pill opens paper mode (not a permanent filter chip).

### Journal status filters (live only)
| Filter | Meaning |
|--------|---------|
| All | Live trades in date range; header rotating quote (**tap** → next quote) |
| Not reviewed | live && `status === 'open'` |
| Reviewed | live && `status === 'reviewed'` |
| Wins | live && reviewed && `pnl > 0`; optional **P&amp;L** Low→High / High→Low (default = take-order; re-tap Wins resets) |
| Losses | live && reviewed && `pnl < 0`; same optional P&amp;L sort |

Paper trades **never** appear in these chips.

### Paper trade mode
- Entry: header **Paper** (hidden while already in paper mode)
- List: only `isPaper === true`, same date range pill
- FAB → `TradeForm({ isPaper: true })`; review/detail same stack, preserved `isPaper`
- Exit: **← Live journal**
- Cards show a **Paper** badge; Dashboard / live filters / stats ignore them

### Strategy conditions & setup mark
- UI label: **Mandatory type**
- Options: **Core · 2**, **Minor · 1** (Secondary removed)
- Trade form shows live **Setup mark** `score / max`; persisted as `conditionScore` / `conditionScoreMax`

### Rotating quotes
`useRotatingQuote` — auto-rotate ~12s; **`nextQuote`** on subtitle tap (Dashboard, Rules, Journal All). Timer restarts after tap.

### Trade detail layout
1. Status + P&amp;L hero (always visible); paper noted in status when applicable
2. Collapsible **Trade details** (default **closed**) — grid + reasons; **Stop loss / Target** show price · potential ₹ (green/red)
3. Collapsible **Notes & screenshots** (default **open** if any content)
   - Entry notes: neutral “At entry” card
   - After exit: two separate cards — teal **What to follow (Good things)** and red **What not to follow (Bad things)**
   - Screenshots: tap to view; **Delete only in full-screen viewer** (no thumbnail ×)

### Screenshots lifecycle
- Pick → persist to app `trade-images/` + mirror to Journal/images on backup
- Delete (viewer) → remove from trade + disk (app + Journal/images) immediately via `removeTradeImage` / form remove
- Delete trade → deletes all its images from disk

### Confirmations
Do **not** use `Alert.alert`. Use `useConfirm()`:
- `confirm({ title, message, tone, confirmLabel })` → Promise&lt;boolean&gt;
- `notice({ title, message, tone })` → single OK

Used for: delete trade/image, start fresh, logout, strategy deletes, etc.

### Keyboard & password
- `SafeScreen` supports `keyboardAvoiding` for form screens
- `Input` prop `showVisibilityToggle` — eye icon for secure fields (Login, Biometric, Profile)

---

## 11. Key components (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `SafeScreen` | Safe-area + themed bg; optional **`keyboardAvoiding`** |
| `ScreenHeader` | Title + animated subtitle + optional right (e.g. journal date pill) |
| `DynamicDescription` | Accent-rail animated header subtitle only |
| `Button` | primary / secondary / ghost / danger |
| `Input` | Forms; optional **`showVisibilityToggle`** |
| `FieldLabel`, `DateField`, `SegmentedControl` | Forms |
| `TradeCard`, `TradeImage`, `ScreenshotGallery` | Journal cards/media (delete from viewer only) |
| `EmptyState` | Empty lists + CTA |
| `ContextFilterChip` | Filter/preset chips |
| `FabButton` | Circular + FAB |
| `FadeSlideIn`, `ScalePop`, `PulseGlow` | Motion |
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

Restore from Profile keeps the current session and loads trades + screenshots into the app.

---

## 13. Source tree (`src/`)

```
src/
├── animation/tokens.ts
├── assets/
├── components/
├── data/quotes.ts
├── hooks/useRotatingQuote.ts
├── navigation/
├── screens/
│   ├── Auth/     (Splash, Login, Biometric)
│   ├── Dashboard/
│   ├── Journal/  (List, Form, Detail, Review)
│   ├── Profile/
│   └── Rules/
├── services/     (storage, folderBackup, tradeImages, auth, biometrics)
├── store/journalStore.ts
├── theme/
├── types/index.ts
└── utils/        (format, id, stats, dateRange)
```

Root: `App.tsx`, `package.json`, `APPLICATION.md`, `android/`, `ios/`.

---

## 14. Conventions for future changes

1. **Local-first** — no server unless explicitly adding one.
2. **Themes** — always `useTheme` / `useThemedStyles`.
3. **Confirms** — `useConfirm()`, not system `Alert`.
4. **Images** — persist via `tradeImages`; store filenames; **delete from disk** when removing from a trade; viewer-only delete UX.
5. **Fingerprint** — cold start only; respect `fingerprintLockEnabled`.
6. **Trade lifecycle** — entry (`open`, `date` = entry) → review (`reviewed`, `exitDate`, `outcome`, `exitPrice`, `charges`, `pnl`, `pnlPercent`).
7. **Dashboard / Journal stats** — reviewed trades for P&amp;L aggregates; keep open trades out of win rate / net %.
8. **Backup** — Profile **Backup now** / **Restore from folder** for `Documents/Journal/`; extend `migrateAppData` for shape changes.
9. **Condition weights** — only `core` \| `minor`; keep scoring helpers in `types`.
10. **Date ranges** — reuse `src/utils/dateRange.ts` (don’t duplicate presets).
11. Prefer existing components (`Button`, `DateField`, `FabButton`, chips, `SafeScreen keyboardAvoiding`) over one-offs.

---

## 15. Scripts

```bash
npm start          # Metro
npm run android    # Run Android (rebuild after native FolderAccess changes)
npm run ios
npm run lint
npm test
```

Require Node `>= 22.11.0`. Native wipe/delete image APIs need an Android rebuild after Kotlin changes.

---

## 16. Quick mental model

```
Cold start
  → Splash + hydrate AsyncStorage
  → Login (local, show/hide password)
  → (optional) Fingerprint
  → Tabs: Rules | Dashboard* | Journal
       Dashboard → date range stats (₹, %, traded; live only) + tap quote + Profile
         Profile → Backup now / Restore from folder (JSON + images)
       Journal → date pill + Paper (header) + live filters / paper mode → Form / Detail / Review
       Rules → Strategies (expand conditions; ⋯ Edit/Copy/Delete) + Trade Checklist + tap quote
```

`*` = default tab.

---

## 17. Changelog (doc sync)

Recent product/code updates reflected in this document:

- Start fresh wipe (native) + confirm; image delete from Journal folder
- Themes: light (ocean cyan) / ocean dusk (dark & slate removed; migrate → ocean)
- Keyboard avoiding; password visibility eye
- Strategy Mandatory type Core/Minor + setup marks on trades/list
- P&amp;L %, traded amount (detail, review, dashboard, list)
- Journal compact date-range sheet (shared with dashboard presets)
- Entry date / exit date / hold days
- Trade detail collapsible sections; differentiated entry vs review notes
- Screenshot delete only from full-screen viewer
- Stop loss / Target potential ₹ on trade detail
- Wins/Losses optional P&amp;L sort (default take-order)
- Tap rotating quote to advance
- **Paper trade** (`isPaper`) — header entry, isolated list, excluded from Dashboard/live filters
- Rules strategies: expand on tap, ⋯ popover actions (Edit/Copy/Delete), section opens on tab focus
- After-exit review split into **What to follow** / **What not to follow** (`reviewFollowNotes` / `reviewAvoidNotes`)
- Restore is **Profile-only** (no launch restore screen); path **`Documents/Journal/`**; **Backup now** is the only folder write (full JSON + image sync, including removals); no live folder backup

---

*Living app map for TradeJournal. Update this file when navigation, data model, auth, backup, or major UX flows change.*
