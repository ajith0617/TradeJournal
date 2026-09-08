import RNFS from 'react-native-fs';

export const TRADE_IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/trade-images`;

async function ensureImageDir(): Promise<void> {
  if (!(await RNFS.exists(TRADE_IMAGE_DIR))) {
    await RNFS.mkdir(TRADE_IMAGE_DIR);
  }
}

function guessExt(uri?: string, type?: string): string {
  if (type?.includes('png')) {
    return 'png';
  }
  if (type?.includes('webp')) {
    return 'webp';
  }
  const lower = (uri ?? '').toLowerCase();
  if (lower.includes('.png')) {
    return 'png';
  }
  if (lower.includes('.webp')) {
    return 'webp';
  }
  return 'jpg';
}

/** Filename only (portable for backup). */
export function tradeImageFileName(stored: string): string {
  const cleaned = stored.replace(/^file:\/\//, '').replace(/^images\//, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || cleaned;
}

/** Absolute filesystem path for a stored image ref. */
export function tradeImageFsPath(stored: string): string {
  if (!stored) {
    return stored;
  }
  let path = stored.replace(/^file:\/\//, '');
  if (path.startsWith('content://') || path.startsWith('ph://')) {
    return path;
  }
  if (path.startsWith('images/')) {
    path = `${TRADE_IMAGE_DIR}/${path.slice('images/'.length)}`;
  } else if (!path.startsWith('/')) {
    path = `${TRADE_IMAGE_DIR}/${path}`;
  }
  return path;
}

/** Normalize path so <Image> can load it on Android/iOS. */
export function toDisplayImageUri(stored: string): string {
  if (!stored) {
    return stored;
  }
  if (
    stored.startsWith('content://') ||
    stored.startsWith('http://') ||
    stored.startsWith('https://') ||
    stored.startsWith('data:') ||
    stored.startsWith('ph://')
  ) {
    return stored;
  }
  const fsPath = tradeImageFsPath(stored);
  if (fsPath.startsWith('file://')) {
    return fsPath;
  }
  return `file://${fsPath}`;
}

/**
 * Copy a picked gallery/camera asset into permanent app storage.
 * Stores/returns a portable filename (not a temporary content:// URI).
 */
export async function persistTradeImage(asset: {
  uri?: string | null;
  base64?: string | null;
  type?: string | null;
  fileName?: string | null;
}): Promise<string | null> {
  const uri = asset.uri?.trim();
  if (!uri && !asset.base64) {
    return null;
  }

  await ensureImageDir();
  const ext = guessExt(uri ?? asset.fileName ?? undefined, asset.type ?? undefined);
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const destPath = `${TRADE_IMAGE_DIR}/${name}`;

  if (asset.base64) {
    await RNFS.writeFile(destPath, asset.base64, 'base64');
    return name;
  }

  if (!uri) {
    return null;
  }

  // Already in our permanent folder — keep filename
  if (uri.includes('/trade-images/')) {
    return tradeImageFileName(uri);
  }

  try {
    const sourcePath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
    await RNFS.copyFile(sourcePath, destPath);
    return name;
  } catch {
    try {
      await RNFS.copyFile(uri, destPath);
      return name;
    } catch {
      return null;
    }
  }
}

export async function persistTradeImages(
  assets: Array<{
    uri?: string | null;
    base64?: string | null;
    type?: string | null;
    fileName?: string | null;
  }>,
): Promise<string[]> {
  const out: string[] = [];
  for (const asset of assets) {
    const saved = await persistTradeImage(asset);
    if (saved) {
      out.push(saved);
    }
  }
  return out;
}

/** Copy all trade images into Journal/images next to the JSON backup. */
export async function backupTradeImagesToFolder(
  journalDir: string,
  imageRefs: string[],
): Promise<void> {
  const destDir = `${journalDir}/images`;
  if (!(await RNFS.exists(destDir))) {
    await RNFS.mkdir(destDir);
  }

  const unique = [...new Set(imageRefs.filter(Boolean))];
  for (const ref of unique) {
    const name = tradeImageFileName(ref);
    if (!name) {
      continue;
    }
    const src = tradeImageFsPath(ref);
    const dest = `${destDir}/${name}`;
    try {
      if (!(await RNFS.exists(src))) {
        continue;
      }
      if (await RNFS.exists(dest)) {
        continue;
      }
      await RNFS.copyFile(src, dest);
    } catch {
      // skip individual image failures
    }
  }
}

/**
 * After restore: copy Journal/images → app storage and rewrite trade image refs
 * to portable filenames.
 */
export async function restoreTradeImagesFromFolder(
  journalDir: string,
  imageRefs: string[],
): Promise<string[]> {
  await ensureImageDir();
  const srcDir = `${journalDir}/images`;
  const restored: string[] = [];

  for (const ref of imageRefs) {
    const name = tradeImageFileName(ref);
    if (!name) {
      continue;
    }
    const dest = `${TRADE_IMAGE_DIR}/${name}`;
    const fromBackup = `${srcDir}/${name}`;
    try {
      if (await RNFS.exists(fromBackup)) {
        if (!(await RNFS.exists(dest))) {
          await RNFS.copyFile(fromBackup, dest);
        }
        restored.push(name);
        continue;
      }
      // Already local
      if (await RNFS.exists(tradeImageFsPath(ref))) {
        restored.push(name);
      }
    } catch {
      // skip
    }
  }
  return restored;
}

export function journalDirFromBackupFile(backupFilePath: string): string {
  return backupFilePath.replace(/\/[^/]+$/, '');
}
