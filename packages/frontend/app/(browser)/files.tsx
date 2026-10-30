import { RiFolderLine } from '@oxy.so/bloom/icons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Browser } from '@/components/Browser';
import { useLocale } from '@/hooks/use-locale';
import { useLocalFolder } from '@/hooks/use-local-folder';
import { useLocalPlaces } from '@/hooks/use-local-places';
import { hasLocalFiles } from '@/lib/local-files';
import { isSameUri, parentUri, placeOf, uriName } from '@/lib/local-places';
import { hrefFor } from '@/lib/routes';

/** A folder on this device, by its URI. */
export default function FolderScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  if (!hasLocalFiles() || !uri?.startsWith('file://')) return <Redirect href="/" />;
  return <Folder uri={uri} />;
}

function Folder({ uri }: { uri: string }) {
  const { strings } = useLocale();
  const { places } = useLocalPlaces();
  const state = useLocalFolder(uri);
  const place = places.find((each) => isSameUri(each.uri, uri));
  // A folder that went leaves the window on its parent, as Finder does,
  // while the parent is still in one of the person's places.
  if (state.status === 'missing') {
    const parent = parentUri(uri);
    return (
      <Redirect href={placeOf(parent, places) ? hrefFor({ kind: 'folder', uri: parent }) : '/'} />
    );
  }
  // Each folder is its own pane, as Finder's: what was selected, searched or
  // scrolled to in one does not carry into the next.
  return (
    <Browser
      key={uri}
      listing={{
        location: { kind: 'folder', uri },
        title: place?.name ?? uriName(uri),
        items: state.status === 'ready' ? state.items : [],
        status: state.status === 'ready' ? 'ready' : 'error',
        layout: 'files',
        empty: { icon: RiFolderLine, title: strings.empty.folder },
      }}
    />
  );
}
