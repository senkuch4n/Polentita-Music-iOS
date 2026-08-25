import TrackPlayer from 'react-native-track-player';
import { ensurePlayerSetup } from './setup';
import type { PreviewAudioResult } from '../native/pythonBridge';

// Android's "preview" plays real audio through the app's own player rather
// than a separate isolated engine, so a preview replaces whatever's in the
// queue (mirrors that trade-off deliberately -- an isolated non-disruptive
// preview player is a bigger separate feature). The synthetic id lets
// callers detect "is THIS result currently previewing" via useActiveTrack().
export function previewTrackId(videoId: string): string {
  return `preview-${videoId}`;
}

export async function playPreview(media: PreviewAudioResult): Promise<void> {
  await ensurePlayerSetup();
  await TrackPlayer.reset();
  await TrackPlayer.add([
    {
      id: previewTrackId(media.id),
      url: media.streamUrl,
      title: media.title,
      artist: media.artist || undefined,
      artwork: media.thumbnail || undefined,
      duration: media.durationMs / 1000,
    },
  ]);
  await TrackPlayer.play();
}

export async function stopPreview(): Promise<void> {
  await TrackPlayer.reset();
}
