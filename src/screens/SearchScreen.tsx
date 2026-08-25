import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import TrackPlayer, { useActiveTrack, usePlaybackState, State } from 'react-native-track-player';
import { theme, screenStyles } from '../theme';
import { SearchResultCard, SearchResultCardSkeleton } from '../components/SearchResultCard';
import { useAllSongs } from '../hooks/useSongs';
import { useDownloads } from '../hooks/useDownloads';
import { enqueueDownload } from '../downloads/downloadManager';
import { searchYoutube, previewAudio, type SearchResultItem } from '../native/pythonBridge';
import { playPreview, previewTrackId } from '../playback/preview';
import { pickRecommendationQuery } from '../search/recommendations';
import {
  getAllSavedReferences,
  removeSavedReferenceByVideoId,
  saveReference,
  type SavedReference,
} from '../db/savedReferencesRepository';
import { useRootNavigation } from '../navigation/hooks';

const PAGE_SIZE = 20;

function referenceToResultItem(ref: SavedReference): SearchResultItem {
  return {
    id: ref.videoId,
    title: ref.title,
    channel: ref.channel,
    durationMs: ref.durationMs,
    thumbnail: ref.thumbnail ?? '',
    webpageUrl: ref.sourceUrl,
    uploadDate: '',
  };
}

export function SearchScreen() {
  const db = useSQLiteContext();
  const navigation = useRootNavigation();
  const { songs } = useAllSongs();
  const { downloads } = useDownloads();
  const activeTrack = useActiveTrack();
  const playback = usePlaybackState();

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [isRecommendations, setIsRecommendations] = useState(true);
  const [recommendationLabel, setRecommendationLabel] = useState('');
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  const reloadSaved = useCallback(async () => {
    setSavedReferences(await getAllSavedReferences(db));
  }, [db]);

  useEffect(() => {
    reloadSaved();
  }, [reloadSaved]);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const seed = await pickRecommendationQuery(db);
      const result = await searchYoutube(seed, 0, PAGE_SIZE);
      setItems(result.items);
      setPage(0);
      setHasMore(result.hasMore);
      setIsRecommendations(true);
      setSearchedQuery('');
      setRecommendationLabel(seed);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadRecommendations();
    // Only on mount -- explicit searches/refreshes are user-triggered from here on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const librarySourceUrls = useMemo(() => new Set(songs.map((s) => s.sourceUrl).filter(Boolean)), [songs]);
  const savedVideoIds = useMemo(() => new Set(savedReferences.map((r) => r.videoId)), [savedReferences]);
  const downloadByVideoId = useMemo(() => {
    // `downloads` is ordered newest-first; keep only the first (newest)
    // entry seen per video so a retried download's status wins over a
    // stale earlier failure for the same video.
    const map = new Map<string, (typeof downloads)[number]>();
    for (const d of downloads) {
      if (!map.has(d.videoId)) map.set(d.videoId, d);
    }
    return map;
  }, [downloads]);

  async function handleDownload(item: SearchResultItem) {
    try {
      await enqueueDownload(db, item);
    } catch (e: any) {
      Alert.alert('No se pudo iniciar la descarga', e?.message ?? String(e));
    }
  }

  async function handleToggleSave(item: SearchResultItem) {
    if (savedVideoIds.has(item.id)) {
      await removeSavedReferenceByVideoId(db, item.id);
    } else {
      await saveReference(db, {
        sourceUrl: item.webpageUrl,
        videoId: item.id,
        title: item.title,
        channel: item.channel,
        thumbnail: item.thumbnail || null,
        durationMs: item.durationMs,
      });
    }
    await reloadSaved();
  }

  async function handlePreview(item: SearchResultItem) {
    const trackId = previewTrackId(item.id);
    if (activeTrack?.id === trackId) {
      playback.state === State.Playing ? await TrackPlayer.pause() : await TrackPlayer.play();
      return;
    }
    setPreviewLoadingId(item.id);
    try {
      const media = await previewAudio(item.webpageUrl);
      await playPreview(media);
    } catch (e: any) {
      Alert.alert('No se pudo reproducir la vista previa', e?.message ?? String(e));
    } finally {
      setPreviewLoadingId(null);
    }
  }

  async function runSearch(nextPage: number, append: boolean) {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setError('Escribí al menos 3 caracteres para buscar.');
      return;
    }
    setError(null);
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const result = await searchYoutube(trimmed, nextPage, PAGE_SIZE);
      setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      setPage(result.page);
      setHasMore(result.hasMore);
      setSearchedQuery(trimmed);
      setIsRecommendations(false);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      if (!append) setItems([]);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }

  function clearSearch() {
    setQuery('');
    loadRecommendations();
  }

  const listHeader = isRecommendations && savedReferences.length > 0 ? (
    <View style={styles.savedSection}>
      <Text style={styles.savedTitle}>Guardado para después</Text>
      {savedReferences.map((ref) => {
        const item = referenceToResultItem(ref);
        return (
          <SearchResultCard
            key={ref.id}
            item={item}
            inLibrary={librarySourceUrls.has(item.webpageUrl)}
            download={downloadByVideoId.get(item.id)}
            isSaved
            isPreviewing={activeTrack?.id === previewTrackId(item.id) && playback.state === State.Playing}
            previewLoading={previewLoadingId === item.id}
            onToggleSave={() => handleToggleSave(item)}
            onPreview={() => handlePreview(item)}
            onDownload={() => handleDownload(item)}
          />
        );
      })}
      <Text style={styles.sectionTitle}>{`Recomendaciones${recommendationLabel ? ` · ${recommendationLabel}` : ''}`}</Text>
    </View>
  ) : isRecommendations && recommendationLabel ? (
    <View style={styles.recommendationsHeader}>
      <Text style={styles.sectionTitle}>{`Recomendaciones · ${recommendationLabel}`}</Text>
      <Pressable onPress={loadRecommendations} hitSlop={8}>
        <Text style={styles.refreshLink}>Otra mezcla</Text>
      </Pressable>
    </View>
  ) : null;

  return (
    <View style={screenStyles.screen}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={theme.colors.secondaryOnDark} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar en YouTube…"
          placeholderTextColor={theme.colors.secondaryOnDark}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => runSearch(0, false)}
        />
        {query.length > 0 && (
          <Pressable hitSlop={8} onPress={clearSearch}>
            <Ionicons name="close-circle" size={18} color={theme.colors.secondaryOnDark} />
          </Pressable>
        )}
        <Pressable style={styles.downloadsButton} onPress={() => navigation.navigate('DownloadsNew')} hitSlop={8}>
          <Ionicons name="arrow-down-circle-outline" size={22} color={theme.colors.secondaryOnDark} />
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={{ paddingTop: theme.spacing.small }}>
          {[0, 1, 2].map((i) => <SearchResultCardSkeleton key={i} />)}
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="search" size={32} color={theme.colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>{searchedQuery ? 'Sin resultados' : 'No encontramos recomendaciones'}</Text>
          <Text style={screenStyles.subtitle}>
            {searchedQuery ? `No encontramos nada para "${searchedQuery}".` : 'Probá buscar algo directamente.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ paddingTop: theme.spacing.small, paddingBottom: theme.spacing.huge }}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <SearchResultCard
              item={item}
              inLibrary={librarySourceUrls.has(item.webpageUrl)}
              download={downloadByVideoId.get(item.id)}
              isSaved={savedVideoIds.has(item.id)}
              isPreviewing={activeTrack?.id === previewTrackId(item.id) && playback.state === State.Playing}
              previewLoading={previewLoadingId === item.id}
              onToggleSave={() => handleToggleSave(item)}
              onPreview={() => handlePreview(item)}
              onDownload={() => handleDownload(item)}
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !loadingMore && !isRecommendations) runSearch(page + 1, true);
          }}
          ListFooterComponent={loadingMore ? <SearchResultCardSkeleton /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
    margin: theme.spacing.large,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radii.pill,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.primaryOnDark,
    fontSize: 16,
  },
  downloadsButton: {
    paddingLeft: theme.spacing.xs,
  },
  error: {
    color: theme.colors.accent,
    paddingHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.small,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.huge,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.large,
    backgroundColor: theme.colors.accent + '1F',
    borderWidth: 1,
    borderColor: theme.colors.accent + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.large,
  },
  emptyTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  savedSection: {
    marginBottom: theme.spacing.small,
  },
  savedTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.medium,
  },
  sectionTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: theme.spacing.large,
    marginTop: theme.spacing.large,
    marginBottom: theme.spacing.medium,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.large,
  },
  refreshLink: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
