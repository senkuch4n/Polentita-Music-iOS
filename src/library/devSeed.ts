import { Asset } from 'expo-asset';
import type { DocumentPickerAsset } from 'expo-document-picker';

// Dev-only helper: the Simulator has no easy way to get a real audio file into
// the Files app for DocumentPicker to see, so this feeds a bundled sample
// through the same import path a real picker result would use. __DEV__-gated;
// never called from a release build. Delete once real-device testing with
// the user's own library is the norm.
export async function loadDevSeedAsset(): Promise<DocumentPickerAsset> {
  const asset = Asset.fromModule(require('../../assets/dev/test-song.m4a'));
  await asset.downloadAsync();
  return {
    uri: asset.localUri ?? asset.uri,
    name: 'test-song.m4a',
    mimeType: 'audio/mp4',
  } as DocumentPickerAsset;
}
