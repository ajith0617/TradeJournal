import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import type {AppData} from '../types';
import {migrateAppDataForBackup} from './storage';
import {
  clearJournalFolderImages,
  clearLocalTradeImages,
  journalDirFromBackupFile,
  restoreTradeImagesFromFolder,
  syncTradeImagesToFolder,
  tradeImageFileName,
} from './tradeImages';

const FOLDER_NAME = 'Journal';
const FILE_NAME = 'journal-data.json';

type FolderAccessNative = {
  hasAllFilesAccess: () => Promise<boolean>;
  openAllFilesAccessSettings: () => Promise<boolean>;
  wipeJournalBackup: () => Promise<boolean>;
  /** Absolute path to journal-data.json if found on public storage, else null */
  findJournalBackup?: () => Promise<string | null>;
};

const FolderAccess = NativeModules.FolderAccess as FolderAccessNative | undefined;

/** Public paths that survive uninstall. Documents/Journal is canonical. */
function publicFilePaths(): string[] {
  const paths: string[] = [];
  const root = RNFS.ExternalStorageDirectoryPath;
  if (root) {
    paths.push(`${root}/Documents/${FOLDER_NAME}/${FILE_NAME}`);
  }
  // Legacy fallback — older backups may still be under Download
  if (RNFS.DownloadDirectoryPath) {
    paths.push(`${RNFS.DownloadDirectoryPath}/${FOLDER_NAME}/${FILE_NAME}`);
  }
  if (root) {
    paths.push(`${root}/Download/${FOLDER_NAME}/${FILE_NAME}`);
  }
  return [...new Set(paths)];
}

/**
 * App-private path — wiped on uninstall. Never treat as the durable backup.
 * Kept only as a last-resort probe for older builds.
 */
function privateFilePaths(): string[] {
  if (!RNFS.ExternalDirectoryPath) {
    return [];
  }
  return [`${RNFS.ExternalDirectoryPath}/${FOLDER_NAME}/${FILE_NAME}`];
}

function candidateFilePaths(): string[] {
  return [...publicFilePaths(), ...privateFilePaths()];
}

export function describeBackupLocation(): string {
  return 'Documents/Journal/';
}

export function describeBackupFile(): string {
  return `${describeBackupLocation()}${FILE_NAME}`;
}

export async function hasAllFilesAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (FolderAccess?.hasAllFilesAccess) {
    try {
      return await FolderAccess.hasAllFilesAccess();
    } catch {
      // fall through
    }
  }
  return false;
}

export async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (typeof Platform.Version === 'number' && Platform.Version >= 30) {
    return hasAllFilesAccess();
  }
  if (typeof Platform.Version === 'number' && Platform.Version >= 23) {
    const write = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    return write === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export async function openAllFilesAccessSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  if (FolderAccess?.openAllFilesAccessSettings) {
    await FolderAccess.openAllFilesAccessSettings();
    return;
  }
  throw new Error('All files access settings unavailable. Rebuild the app.');
}

async function ensureDirForFile(filePath: string): Promise<void> {
  const dir = filePath.replace(/\/[^/]+$/, '');
  if (!(await RNFS.exists(dir))) {
    await RNFS.mkdir(dir);
  }
}

function collectImageRefs(data: AppData): string[] {
  const refs: string[] = [];
  for (const trade of data.trades ?? []) {
    for (const img of trade.images ?? []) {
      if (img) {
        refs.push(img);
      }
    }
  }
  return refs;
}

/** Rewrite image refs to portable filenames for the JSON backup. */
function withPortableImageRefs(data: AppData): AppData {
  return {
    ...data,
    trades: (data.trades ?? []).map(t => ({
      ...t,
      images: (t.images ?? []).map(img => tradeImageFileName(img)),
    })),
  };
}

function appDataWeight(data: AppData): number {
  return (
    (data.trades?.length ?? 0) * 10 +
    (data.strategies?.length ?? 0) * 2 +
    (data.rules?.length ?? 0)
  );
}

async function readRawBackupAt(path: string): Promise<AppData | null> {
  try {
    const raw = await RNFS.readFile(path, 'utf8');
    if (!raw || raw.length < 2) {
      return null;
    }
    return extractAppDataFromBackupJson(raw);
  } catch {
    return null;
  }
}

/**
 * Accepts:
 * - AppData at root
 * - { version, data: AppData }
 * - Double-wrapped { data: { version, data: AppData } }
 * - data stored as a JSON string
 * Picks the nested object with the most trades so restore never drops a full backup.
 */
export function extractAppDataFromBackupJson(raw: string): AppData {
  let parsed: unknown = JSON.parse(raw);
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const candidates: Record<string, unknown>[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 8 || node == null) {
      return;
    }
    if (typeof node === 'string') {
      try {
        visit(JSON.parse(node), depth + 1);
      } catch {
        // ignore
      }
      return;
    }
    if (typeof node !== 'object' || Array.isArray(node)) {
      return;
    }
    const obj = node as Record<string, unknown>;
    candidates.push(obj);
    if ('data' in obj) {
      visit(obj.data, depth + 1);
    }
    // Some manual backups nest under "journal" / "appData"
    if ('journal' in obj) {
      visit(obj.journal, depth + 1);
    }
    if ('appData' in obj) {
      visit(obj.appData, depth + 1);
    }
  };
  visit(parsed, 0);

  if (candidates.length === 0) {
    throw new Error('Backup JSON is invalid.');
  }

  const score = (obj: Record<string, unknown>) => {
    const trades = obj.trades;
    const tradeN = Array.isArray(trades) ? trades.length : -1;
    const strategies = Array.isArray(obj.strategies) ? obj.strategies.length : 0;
    const rules = Array.isArray(obj.rules) ? obj.rules.length : 0;
    // Prefer real AppData shapes with a trades array
    return tradeN * 1000 + strategies * 10 + rules;
  };

  let best = candidates[0];
  let bestScore = score(best);
  for (let i = 1; i < candidates.length; i++) {
    const s = score(candidates[i]);
    if (s > bestScore) {
      best = candidates[i];
      bestScore = s;
    }
  }

  if (!Array.isArray(best.trades)) {
    // Last resort: any candidate with trades[]
    const withTrades = candidates.find(c => Array.isArray(c.trades));
    if (withTrades) {
      best = withTrades;
    }
  }

  return migrateAppDataForBackup(best as unknown as AppData);
}

/**
 * Never overwrite a richer folder backup with empty/nearly-empty local data
 * unless the user explicitly forced Backup now.
 */
async function assertSafeToOverwrite(
  path: string,
  outgoing: AppData,
  force: boolean,
): Promise<void> {
  if (force) {
    return;
  }
  const existing = await readRawBackupAt(path);
  if (!existing) {
    return;
  }
  const outW = appDataWeight(outgoing);
  const inW = appDataWeight(existing);
  if (inW > 0 && outW === 0) {
    throw new Error(
      'Refusing to overwrite Journal backup with empty app data. Restore from the folder first.',
    );
  }
  if (inW > outW * 2 && (outgoing.trades?.length ?? 0) === 0) {
    throw new Error(
      'Refusing to overwrite a fuller Journal backup with empty trades.',
    );
  }
}

/** Manual Profile backup — writes JSON + syncs images (additions and removals). */
export async function writeFolderBackup(
  data: AppData,
  options?: {force?: boolean},
): Promise<string> {
  const force = options?.force === true;
  const allowed = await requestStoragePermission();
  if (!allowed) {
    throw new Error(
      'Need All files access to save Documents/Journal/. Enable it, then backup again.',
    );
  }

  const portable = withPortableImageRefs(data);
  const payload = JSON.stringify(
    {
      version: 2,
      savedAt: new Date().toISOString(),
      data: portable,
    },
    null,
    2,
  );

  let lastError: unknown;
  // Prefer public Documents path; never rely on app-private (wiped on uninstall)
  for (const path of publicFilePaths()) {
    try {
      await assertSafeToOverwrite(path, portable, force);
      await ensureDirForFile(path);
      await RNFS.writeFile(path, payload, 'utf8');
      const journalDir = journalDirFromBackupFile(path);
      await syncTradeImagesToFolder(journalDir, collectImageRefs(data));
      return path;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not write Journal backup to Documents/Journal/');
}

export type BackupProbe = {
  path: string | null;
  readable: boolean;
  existsButBlocked: boolean;
};

export async function probeFolderBackup(): Promise<BackupProbe> {
  // Native probe can see public files when All files access is granted
  if (FolderAccess?.findJournalBackup) {
    try {
      const nativePath = await FolderAccess.findJournalBackup();
      if (nativePath) {
        try {
          const raw = await RNFS.readFile(nativePath, 'utf8');
          if (raw && raw.length > 2) {
            return {path: nativePath, readable: true, existsButBlocked: false};
          }
        } catch {
          return {
            path: nativePath,
            readable: false,
            existsButBlocked: true,
          };
        }
      }
    } catch {
      // fall through to JS probe
    }
  }

  let blockedPath: string | null = null;

  for (const path of publicFilePaths()) {
    try {
      const exists = await RNFS.exists(path);
      if (!exists) {
        continue;
      }
      try {
        const raw = await RNFS.readFile(path, 'utf8');
        if (raw && raw.length > 2) {
          return {path, readable: true, existsButBlocked: false};
        }
      } catch {
        blockedPath = path;
      }
    } catch {
      // try next
    }
  }

  if (blockedPath) {
    return {path: blockedPath, readable: false, existsButBlocked: true};
  }
  return {path: null, readable: false, existsButBlocked: false};
}

function assertValidBackupData(data: AppData): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Backup JSON is invalid.');
  }
  if (!Array.isArray(data.trades)) {
    throw new Error(
      'Backup JSON is missing trades[]. Expected an AppData object or { version, data: { trades: [...] } }.',
    );
  }
}

/** Read every candidate backup and return the richest AppData + its path. */
async function readBestFolderBackup(): Promise<{path: string; data: AppData}> {
  const paths: string[] = [];

  if (FolderAccess?.findJournalBackup) {
    try {
      const nativePath = await FolderAccess.findJournalBackup();
      if (nativePath) {
        paths.push(nativePath);
      }
    } catch {
      // ignore
    }
  }
  for (const path of publicFilePaths()) {
    paths.push(path);
  }

  const unique = [...new Set(paths)];
  let best: {path: string; data: AppData} | null = null;
  let lastError: unknown;

  for (const path of unique) {
    try {
      const exists = await RNFS.exists(path);
      if (!exists) {
        continue;
      }
      const data = await readRawBackupAt(path);
      if (!data) {
        continue;
      }
      if (!Array.isArray(data.trades)) {
        continue;
      }
      if (!best || appDataWeight(data) > appDataWeight(best.data)) {
        best = {path, data};
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (best) {
    return best;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        `No readable ${FILE_NAME} with trades found in ${describeBackupLocation()} (Download/Journal is checked as a legacy fallback).`,
      );
}

export async function readFolderBackup(): Promise<AppData> {
  const allowed = await hasAllFilesAccess();
  if (!allowed) {
    throw new Error(
      'Need All files access (not Camera or Photos). Enable it, then tap Restore again.',
    );
  }

  try {
    const {path, data} = await readBestFolderBackup();
    assertValidBackupData(data);
    const journalDir = journalDirFromBackupFile(path);

    const trades = [];
    for (const trade of data.trades ?? []) {
      const images = await restoreTradeImagesFromFolder(
        journalDir,
        trade.images ?? [],
      );
      trades.push({...trade, images});
    }

    const next = {
      ...data,
      trades,
      rules: Array.isArray(data.rules) ? data.rules : [],
      strategies: Array.isArray(data.strategies) ? data.strategies : [],
      ruleChecks: Array.isArray(data.ruleChecks) ? data.ruleChecks : [],
      profile: data.profile,
    };

    if ((next.trades?.length ?? 0) === 0) {
      throw new Error(
        `Read ${path} but trades[] is empty. Open that file and confirm it still has your trades (not an empty overwrite).`,
      );
    }

    return next;
  } catch (e) {
    const probe = await probeFolderBackup();
    if (probe.existsButBlocked) {
      throw new Error(
        'Backup found but Android blocked access. Enable All files access, then try again.',
      );
    }
    throw e instanceof Error
      ? e
      : new Error(
          `No ${FILE_NAME} found in ${describeBackupLocation()}. Put the file there and try again.`,
        );
  }
}

export async function folderBackupExists(): Promise<boolean> {
  const probe = await probeFolderBackup();
  return probe.readable || probe.existsButBlocked;
}

/**
 * Fresh install should offer restore when:
 * - All files access is missing (backup may exist but be invisible), or
 * - A backup file is found.
 */
export async function shouldOfferFolderRestore(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const allowed = await hasAllFilesAccess();
    if (!allowed) {
      return true;
    }
  }
  return folderBackupExists();
}

/**
 * Wipe on-disk Journal backup: entire Journal folder (json + images) and local
 * trade-images. Requires All files access on Android 11+.
 */
export async function wipeFolderBackupAndImages(): Promise<void> {
  const allowed = await hasAllFilesAccess();
  if (!allowed) {
    throw new Error(
      'Need All files access (not Camera or Photos) to delete Documents/Journal. Enable it, then tap Start fresh again.',
    );
  }

  if (FolderAccess?.wipeJournalBackup) {
    try {
      await FolderAccess.wipeJournalBackup();
    } catch (e) {
      throw new Error(nativeErrorMessage(e, 'Could not delete Journal folder'));
    }
  } else {
    for (const path of candidateFilePaths()) {
      const journalDir = journalDirFromBackupFile(path);
      await deletePathRecursive(journalDir);
    }
  }

  for (const path of candidateFilePaths()) {
    await deletePathRecursive(journalDirFromBackupFile(path));
  }
  await clearJournalFolderImages();
  await clearLocalTradeImages();

  const probe = await probeFolderBackup();
  if (probe.readable || probe.existsButBlocked) {
    throw new Error(
      'Journal backup is still on disk. Enable All files access, then tap Start fresh again.',
    );
  }
}

function nativeErrorMessage(e: unknown, fallback: string): string {
  if (typeof e === 'string' && e.trim()) {
    return e;
  }
  if (e instanceof Error && e.message.trim()) {
    return e.message;
  }
  if (typeof e === 'object' && e) {
    const obj = e as {message?: unknown; code?: unknown};
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message;
    }
  }
  return fallback;
}

async function deletePathRecursive(targetPath: string): Promise<void> {
  try {
    if (!(await RNFS.exists(targetPath))) {
      return;
    }
    const stat = await RNFS.stat(targetPath);
    if (stat.isDirectory()) {
      const entries = await RNFS.readDir(targetPath);
      for (const entry of entries) {
        await deletePathRecursive(entry.path);
      }
    }
    await RNFS.unlink(targetPath);
  } catch {
    // caller verifies leftover files
  }
}
