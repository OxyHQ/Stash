/** Items for the tests, with what they do not set left neutral. */
import type { CloudItem, LocalItem } from '@/lib/items';

export function local(name: string, facts: Partial<LocalItem> = {}): LocalItem {
  const uri = facts.uri ?? `file:///home/ada/${name}`;
  return {
    source: 'local',
    key: uri,
    uri,
    name,
    isFolder: false,
    size: 0,
    modifiedAt: 0,
    isHidden: name.startsWith('.'),
    mime: null,
    ...facts,
  };
}

export function folder(uri: string): LocalItem {
  const name = decodeURI(uri.slice(uri.lastIndexOf('/') + 1));
  return local(name, { uri, key: uri, isFolder: true, size: null });
}

export function cloud(name: string, facts: Partial<CloudItem> = {}): CloudItem {
  const assetId = facts.assetId ?? `asset-${name}`;
  return {
    source: 'cloud',
    key: `oxy:${assetId}`,
    assetId,
    name,
    isFolder: false,
    size: 1,
    modifiedAt: 0,
    isHidden: false,
    mime: null,
    hasThumbnail: false,
    ...facts,
  };
}
