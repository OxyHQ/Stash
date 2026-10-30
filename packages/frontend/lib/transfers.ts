/**
 * What an upload to Oxy Files and a download from it will do, worked out
 * before any byte moves: which items go, under which names, and what is left
 * out and why.
 */
import type { CloudItem, LocalItem } from '@/lib/items';
import { mimeForName } from '@/lib/kinds';
import { freeFileName } from '@/lib/names';

/** One local file to upload, as `oxy.assets.upload` takes a file on a native platform. */
export interface UploadSource {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export interface UploadPlan {
  uploads: UploadSource[];
  /** Folders: Oxy Files holds files, with no folders. */
  skippedFolders: LocalItem[];
}

export function planUploads(items: readonly LocalItem[]): UploadPlan {
  const uploads: UploadSource[] = [];
  const skippedFolders: LocalItem[] = [];
  for (const item of items) {
    if (item.isFolder) {
      skippedFolders.push(item);
      continue;
    }
    uploads.push({
      uri: item.uri,
      name: item.name,
      type: item.mime ?? mimeForName(item.name),
      ...(item.size === null ? {} : { size: item.size }),
    });
  }
  return { uploads, skippedFolders };
}

/** One Oxy Files asset to download, and the name it will have in the folder. */
export interface DownloadStep {
  assetId: string;
  fileName: string;
}

/**
 * Downloads into a folder holding `taken` names: each file keeps its name, or
 * takes a number when that name is taken (by an item there or by a file of the
 * same download), so nothing there is ever replaced.
 */
export function planDownloads(
  items: readonly CloudItem[],
  taken: readonly string[],
): DownloadStep[] {
  const names = taken.slice();
  return items.map((item) => {
    const fileName = freeFileName(item.name, names);
    names.push(fileName);
    return { assetId: item.assetId, fileName };
  });
}

/** How far a set of transfers has come, as one fraction, weighted by their sizes where they are known. */
export function overallProgress(
  transfers: readonly { fraction: number; size: number | null }[],
): number {
  if (transfers.length === 0) return 0;
  const isEveryKnown = transfers.every((transfer) => transfer.size !== null && transfer.size > 0);
  if (!isEveryKnown) {
    return transfers.reduce((sum, transfer) => sum + transfer.fraction, 0) / transfers.length;
  }
  const total = transfers.reduce((sum, transfer) => sum + (transfer.size ?? 0), 0);
  const done = transfers.reduce(
    (sum, transfer) => sum + transfer.fraction * (transfer.size ?? 0),
    0,
  );
  return done / total;
}
