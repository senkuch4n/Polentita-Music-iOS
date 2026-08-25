import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { ArtworkView } from './ArtworkView';
import { PressableScale } from './PressableScale';
import { formatDuration } from '../utils/format';
import type { Song } from '../db/types';
import type { AlbumWithCount } from '../db/albumsRepository';
import type { ArtistSummary } from '../db/artistsRepository';

// ArtworkView defaults to a fixed size/height -- grid cards need an explicit
// pixel size instead (computed once by the caller from window width) rather
// than a percentage, since a percentage width would fight with ArtworkView's
// own fixed default height.
interface GridSize {
  size: number;
}

export function SongGridCard({ song, size, isActive, onPress }: GridSize & { song: Song; isActive?: boolean; onPress: () => void }) {
  return (
    <PressableScale style={[styles.gridCard, { width: size }]} onPress={onPress} haptic>
      <ArtworkView uri={song.coverUri} seed={`${song.title}|${song.artist}`} size={size} />
      <Text style={[styles.gridTitle, isActive && styles.gridTitleActive]} numberOfLines={1}>{song.title}</Text>
      <Text style={styles.gridSubtitle} numberOfLines={1}>
        {(song.artist || 'Artista desconocido') + ' · ' + formatDuration(song.durationMs)}
      </Text>
    </PressableScale>
  );
}

export function AlbumGridCard({ album, size, onPress }: GridSize & { album: AlbumWithCount; onPress: () => void }) {
  return (
    <PressableScale style={[styles.gridCard, { width: size }]} onPress={onPress} haptic>
      <View style={{ width: size, height: size }}>
        <View style={[styles.stackShadow, { width: size, height: size }]} />
        <ArtworkView uri={album.coverUri} seed={`${album.name}|${album.artist}`} size={size} />
      </View>
      <Text style={styles.gridTitle} numberOfLines={1}>{album.name}</Text>
      <Text style={styles.gridSubtitle} numberOfLines={1}>
        {album.songCount} {album.songCount === 1 ? 'canción' : 'canciones'}
      </Text>
    </PressableScale>
  );
}

export function ArtistGridCard({ artist, size, onPress }: GridSize & { artist: ArtistSummary; onPress: () => void }) {
  return (
    <PressableScale style={[styles.gridCard, { width: size }]} onPress={onPress} haptic>
      {artist.coverUri ? (
        <ArtworkView uri={artist.coverUri} seed={artist.name} size={size} radius={theme.radii.pill} />
      ) : (
        <View style={[styles.artistFallback, { width: size, height: size, borderRadius: theme.radii.pill }]}>
          <Ionicons name="person" size={size * 0.4} color={theme.colors.accent} />
        </View>
      )}
      <Text style={styles.gridTitle} numberOfLines={1}>{artist.name}</Text>
      <Text style={styles.gridSubtitle} numberOfLines={1}>
        {artist.songCount} {artist.songCount === 1 ? 'canción' : 'canciones'}
      </Text>
    </PressableScale>
  );
}

export function ArtistRow({ artist, onPress }: { artist: ArtistSummary; onPress: () => void }) {
  return (
    <PressableScale style={styles.row} onPress={onPress} haptic>
      {artist.coverUri ? (
        <ArtworkView uri={artist.coverUri} seed={artist.name} size={theme.coverSize.row} radius={theme.radii.pill} />
      ) : (
        <View style={[styles.rowFallback, { width: theme.coverSize.row, height: theme.coverSize.row }]}>
          <Ionicons name="person" size={theme.coverSize.row * 0.5} color={theme.colors.accent} />
        </View>
      )}
      <View style={styles.textBlock}>
        <Text style={styles.rowTitle} numberOfLines={1}>{artist.name}</Text>
        <Text style={styles.gridSubtitle} numberOfLines={1}>
          {artist.songCount} {artist.songCount === 1 ? 'canción' : 'canciones'}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    gap: theme.spacing.xxs,
  },
  gridTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 13,
    fontWeight: '600',
  },
  gridTitleActive: {
    color: theme.colors.accent,
  },
  gridSubtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 11,
  },
  stackShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    borderRadius: theme.radii.medium,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primaryOnDark + '1F',
  },
  artistFallback: {
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.large,
  },
  rowFallback: {
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  rowTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 16,
    fontWeight: '600',
  },
});
