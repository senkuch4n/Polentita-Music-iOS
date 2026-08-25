import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';

let setupPromise: Promise<void> | null = null;

// Idempotent -- safe to call from every screen that needs the player ready
// (mirrors Android's PlaybackController connecting to PlaybackService on demand).
export function ensurePlayerSetup(): Promise<void> {
  if (!setupPromise) {
    setupPromise = TrackPlayer.setupPlayer().then(() =>
      TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      }),
    );
  }
  return setupPromise;
}
