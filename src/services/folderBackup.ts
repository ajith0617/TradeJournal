import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import type {AppData} from '../types';
import {migrateAppDataForBackup} from './storage';
import {
  backupTradeImagesToFolder,
  clearJournalFolderImages,
  clearLocalTradeImages,
  journalDirFromBackupFile,
  restoreTradeImagesFromFolder,
  tradeImageFileName,
} from './tradeImages';

const FOLDER_NAME = 'Journal';
const FILE_NAME = 'journal-data.json';

type FolderAccessNative = {
  hasAllFilesAccess: () => Promise<boolean>;
  openAllFilesAccessSettings: () => Promise<boolean>;
  wipeJournalBackup: () => Promise<boolean>;
};

const FolderAccess = NativeModules.FolderAccess as FolderAccessNative | undefined;

/** Paths that may hold journal-data.json (tried in order). */
function candidateFilePaths(): string[] {
  const paths: string[] = [];
  if (RNFS.DownloadDirectoryPath) {
    paths.push(`${RNFS.DownloadDirectoryPath}/${FOLDER_NAME}/${FILE_NAME}`);
  }
  const root = RNFS.ExternalStorageDirectoryPath;
  if (root) {
    paths.push(`${root}/Download/${FOLDER_NAME}/${FILE_NAME}`);
    paths.push(`${root}/Documents/${FOLDER_NAME}/${FILE_NAME}`);
  }
  if (RNFS.ExternalDirectoryPath) {
    paths.push(`${RNFS.ExternalDirectoryPath}/${FOLDER_NAME}/${FILE_NAME}`);
  }
  return [...new Set(paths)];
}

export function describeBackupLocation(): string {
  return 'Download/Journal/';
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

export async function writeFolderBackup(data: AppData): Promise<string> {
  await requestStoragePermission();
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
  let written: string | null = null;

  for (const path of candidateFilePaths()) {
    try {
      await ensureDirForFile(path);
      await RNFS.writeFile(path, payload, 'utf8');
      const journalDir = journalDirFromBackupFile(path);
      await backupTradeImagesToFolder(journalDir, collectImageRefs(data));
      written = path;
    } catch (e) {
      lastError = e;
    }
  }

  if (written) {
    return written;
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Could not write Journal backup folder');
}

export type BackupProbe = {
  path: string | null;
  readable: boolean;
  existsButBlocked: boolean;
};

export async function probeFolderBackup(): Promise<BackupProbe> {
  let blockedPath: string | null = null;

  for (const path of candidateFilePaths()) {
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

export async function readFolderBackup(): Promise<AppData> {
  const allowed = await hasAllFilesAccess();
  if (!allowed) {
    throw new Error(
      'Need All files access (not Camera or Photos). Enable it, then tap Restore again.',
    );
  }

  const probe = await probeFolderBackup();
  if (probe.readable && probe.path) {
    const raw = await RNFS.readFile(probe.path, 'utf8');
    const parsed = JSON.parse(raw) as {data?: AppData} & AppData;
    const data = migrateAppDataForBackup(parsed.data ?? (parsed as AppData));
    const journalDir = journalDirFromBackupFile(probe.path);

    const trades = [];
    for (const trade of data.trades ?? []) {
      const images = await restoreTradeImagesFromFolder(
        journalDir,
        trade.images ?? [],
      );
      trades.push({...trade, images});
    }
    return {...data, trades};
  }

  if (probe.existsButBlocked) {
    throw new Error(
      'Backup found but Android blocked access. Enable All files access, then try again.',
    );
  }

  throw new Error(
    'No journal-data.json found in Download/Journal/. Put the file there and try again.',
  );
}

export async function folderBackupExists(): Promise<boolean> {
  const probe = await probeFolderBackup();
  return probe.readable || probe.existsButBlocked;
}

/**
 * Wipe on-disk Journal backup: entire Journal folder (json + images) and local
 * trade-images. Requires All files access on Android 11+.
 * Throws if permission is missing or files could not be deleted.
 */
export async function wipeFolderBackupAndImages(): Promise<void> {
  const allowed = await hasAllFilesAccess();
  if (!allowed) {
    throw new Error(
      'Need All files access (not Camera or Photos) to delete Download/Journal. Enable it, then tap Start fresh again.',
    );
  }

  // Native recursive delete is reliable with MANAGE_EXTERNAL_STORAGE
  if (FolderAccess?.wipeJournalBackup) {
    try {
      await FolderAccess.wipeJournalBackup();
    } catch (e) {
      throw new Error(nativeErrorMessage(e, 'Could not delete Journal folder'));
    }
  } else {
    // JS fallback if native module missing (older builds) — still verify below
    for (const path of candidateFilePaths()) {
      const journalDir = journalDirFromBackupFile(path);
      await deletePathRecursive(journalDir);
    }
  }

  // Extra JS cleanup for any leftover candidate paths / local cache
  for (const path of candidateFilePaths()) {
    await deletePathRecursive(journalDirFromBackupFile(path));
  }
  await clearJournalFolderImages();
  await clearLocalTradeImages();

  // Verify primary backup is gone before resetting the app
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
