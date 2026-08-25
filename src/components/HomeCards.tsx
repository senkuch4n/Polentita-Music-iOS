import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ArtworkView } from './ArtworkView';
import { PressableScale } from './PressableScale';
import { formatDuration } from '../utils/format';
import type { Song } from '../db/types';
import type { AlbumWithCount } from '../db/albumsRepository';
import type { PlaylistWithCount } from '../db/playlistsRepository';

const CARD_WIDTH = 140;

/** Vertical cover-on-top card -- used for Continue Listening and Favorites. */
export function SongVerticalCard({
  song,
  onPress,
  showFavoriteBadge,
}: {
  song: Song;
  onPress: () => void;
  showFavoriteBadge?: boolean;
}) {
  return (
    <PressableScale style={styles.verticalCard} onPress={onPress} haptic>
      <View>
        <ArtworkView uri={song.coverUri} seed={`${song.title}|${song.artist}`} size={CARD_WIDTH} radius={theme.radii.medium} />
        {showFavoriteBadge && (
          <View style={styles.heartBadge}>
            <Ionicons name="heart" size={13} color={theme.colors.darkOnBright} />
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{song.title}</Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>{song.artist || 'Artista desconocido'}</Text>
    </PressableScale>
  );
}

/** Compact horizontal mini-row -- used for Recently Added, a visually
 * lighter treatment than the vertical cards so the home screen has some
 * rhythm instead of five identical-looking shelves. */
export function SongCompactCard({ song, onPress }: { song: Song; onPress: () => void }) {
  return (
    <PressableScale style={styles.compactCard} onPress={onPress} haptic>
      <ArtworkView uri={song.coverUri} seed={`${song.title}|${song.artist}`} size={theme.coverSize.row} radius={theme.radii.small} />
      <View style={styles.compactTextBlock}>
        <Text style={styles.cardTitle} numberOfLines={1}>{song.title}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {(song.artist || 'Artista desconocido') + ' · ' + formatDuration(song.durationMs)}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Album card with a "stacked records" effect -- a second box offset behind
 * the cover, echoing android-source's stacked-shadow album cards. */
export function AlbumStackCard({ album, onPress }: { album: AlbumWithCount; onPress: () => void }) {
  return (
    <PressableScale style={styles.verticalCard} onPress={onPress} haptic>
      <View style={styles.stackWrap}>
        <View style={[styles.stackShadow, { width: CARD_WIDTH, height: CARD_WIDTH }]} />
        <ArtworkView uri={album.coverUri} seed={`${album.name}|${album.artist}`} size={CARD_WIDTH} radius={theme.radii.medium} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{album.name}</Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {album.songCount} {album.songCount === 1 ? 'canción' : 'canciones'}
      </Text>
    </PressableScale>
  );
}

export function PlaylistShelfCard({ playlist, onPress }: { playlist: PlaylistWithCount; onPress: () => void }) {
  return (
    <PressableScale style={styles.verticalCard} onPress={onPress} haptic>
      {playlist.coverUri ? (
        <ArtworkView uri={playlist.coverUri} seed={playlist.name} size={CARD_WIDTH} radius={theme.radii.medium} />
      ) : (
        <View style={[styles.playlistFallback, { width: CARD_WIDTH, height: CARD_WIDTH }]}>
          <Ionicons name="albums" size={CARD_WIDTH * 0.32} color={theme.colors.accent} />
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={1}>{playlist.name}</Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {playlist.songCount} {playlist.songCount === 1 ? 'canción' : 'canciones'}
      </Text>
    </PressableScale>
  );
}

export function QuickActionPill({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <PressableScale style={[styles.pill, primary && styles.pillPrimary]} onPress={onPress} haptic>
      <Ionicons name={icon} size={16} color={primary ? theme.colors.darkOnBright : theme.colors.primaryOnDark} />
      <Text style={[styles.pillLabel, primary && styles.pillLabelPrimary]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  verticalCard: {
    width: CARD_WIDTH,
    gap: theme.spacing.xs,
  },
  compactCard: {
    width: 188,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
  },
  compactTextBlock: {
    flex: 1,
  },
  cardTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 14,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
  },
  heartBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: 24,
    height: 24,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackWrap: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
  },
  stackShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: theme.radii.medium,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primaryOnDark + '1F',
  },
  playlistFallback: {
    borderRadius: theme.radii.medium,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primaryOnDark + '1F',
  },
  pillPrimary: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  pillLabel: {
    color: theme.colors.primaryOnDark,
    fontSize: 13,
    fontWeight: '600',
  },
  pillLabelPrimary: {
    color: theme.colors.darkOnBright,
  },
});
