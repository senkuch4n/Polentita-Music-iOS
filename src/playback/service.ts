import TrackPlayer, { Event } from 'react-native-track-player';

// Registered once from index.ts (must run before the app renders) -- reacts to
// lockscreen/Control Center/Bluetooth remote commands, mirroring the Android
// app's MediaSession.Callback in playback/service/PlaybackService.kt.
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position));
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
}
