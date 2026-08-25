import TrackPlayer from 'react-native-track-player';
import type { Song } from '../db/types';
import { songToTrack } from './mapper';
import { ensurePlayerSetup } from './setup';

export async function playSongs(songs: Song[], startIndex = 0): Promise<void> {
  await ensurePlayerSetup();
  await TrackPlayer.reset();
  await TrackPlayer.add(songs.map(songToTrack));
  if (startIndex > 0) {
    await TrackPlayer.skip(startIndex);
  }
  await TrackPlayer.play();
}
