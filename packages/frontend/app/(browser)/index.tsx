import { Redirect } from 'expo-router';
import { useLocalPlaces } from '@/hooks/use-local-places';
import { hrefFor } from '@/lib/routes';

/**
 * Where a window opens: the person's home (or this device's folder) where
 * Stash has files on this device, else Oxy Files.
 */
export default function Start() {
  const { places, isLoading } = useLocalPlaces();
  if (isLoading) return null;
  const start = places.find((place) => place.kind === 'home') ?? places[0];
  return (
    <Redirect href={hrefFor(start ? { kind: 'folder', uri: start.uri } : { kind: 'cloud' })} />
  );
}
