import type { Track } from 'react-native-track-player';
import type { Song } from '../db/types';

export function songToTrack(song: Song): Track {
  return {
    id: String(song.id),
    url: song.contentUri,
    title: song.title,
    artist: song.artist || undefined,
    album: song.albumName || undefined,
    artwork: song.coverUri ?? undefined,
    duration: song.durationMs / 1000,
  };
}
