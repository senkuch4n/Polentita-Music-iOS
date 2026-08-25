import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme, screenStyles } from '../theme';
import { useRecentlyAdded } from '../hooks/useSongs';
import { playSongs } from '../playback/queue';
import { useRootNavigation } from '../navigation/hooks';
import type { Song } from '../db/types';

export function HomeScreen() {
  const { songs } = useRecentlyAdded(10);
  const navigation = useRootNavigation();

  async function handlePlay(song: Song, index: number) {
    await playSongs(songs, index);
    navigation.navigate('Player');
  }

  return (
    <View style={screenStyles.screen}>
      <View style={screenStyles.content}>
        <Text style={screenStyles.title}>Polentita Music</Text>
        <Text style={screenStyles.subtitle}>Tu música, tus listas y tu forma de escucharla.</Text>
      </View>

      {songs.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Agregadas recientemente</Text>
          <FlatList
            data={songs}
            keyExtractor={(item) => String(item.id)}
            horizontal
            contentContainerStyle={{ paddingHorizontal: theme.spacing.large, gap: theme.spacing.medium }}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Pressable style={styles.card} onPress={() => handlePlay(item, index)}>
                <View style={styles.cover} />
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardArtist} numberOfLines={1}>
                  {item.artist || 'Artista desconocido'}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.medium,
  },
  card: {
    width: theme.coverSize.shelf,
  },
  cover: {
    width: theme.coverSize.shelf,
    height: theme.coverSize.shelf,
    borderRadius: theme.radii.medium,
    backgroundColor: theme.colors.surfaceRaised,
    marginBottom: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 14,
    fontWeight: '600',
  },
  cardArtist: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
  },
});
