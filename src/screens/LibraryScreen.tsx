import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { theme, screenStyles } from '../theme';
import { useAllSongs } from '../hooks/useSongs';
import { importPickedFiles } from '../library/importFiles';
import { loadDevSeedAsset } from '../library/devSeed';
import { playSongs } from '../playback/queue';
import { useRootNavigation } from '../navigation/hooks';
import { formatDuration } from '../utils/format';
import type { Song } from '../db/types';

export function LibraryScreen() {
  const db = useSQLiteContext();
  const { songs, loading, reload } = useAllSongs();
  const [importing, setImporting] = useState(false);
  const navigation = useRootNavigation();

  async function handleImport() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    setImporting(true);
    try {
      const outcome = await importPickedFiles(db, result.assets);
      await reload();
      const parts = [`${outcome.imported.length} agregada(s)`];
      if (outcome.duplicates) parts.push(`${outcome.duplicates} ya existían`);
      if (outcome.failed.length) parts.push(`${outcome.failed.length} fallaron`);
      Alert.alert('Importación', parts.join(' · '));
    } finally {
      setImporting(false);
    }
  }

  async function handleDevSeed() {
    setImporting(true);
    try {
      const asset = await loadDevSeedAsset();
      const outcome = await importPickedFiles(db, [asset]);
      await reload();
      if (outcome.failed.length) {
        Alert.alert('Canción de prueba', outcome.failed[0].error);
      }
    } finally {
      setImporting(false);
    }
  }

  async function handlePlay(song: Song, index: number) {
    await playSongs(songs, index);
    navigation.navigate('Player');
  }

  return (
    <View style={screenStyles.screen}>
      <View style={styles.header}>
        <Text style={screenStyles.title}>Biblioteca</Text>
        <Pressable style={styles.importButton} onPress={handleImport} disabled={importing}>
          {importing ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.importButtonText}>Importar música</Text>
          )}
        </Pressable>
        {__DEV__ && (
          <Pressable style={styles.devButton} onPress={handleDevSeed} disabled={importing}>
            <Text style={styles.devButtonText}>+ Canción de prueba (dev)</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: theme.spacing.xxl }} color={theme.colors.accent} />
      ) : songs.length === 0 ? (
        <View style={screenStyles.content}>
          <Text style={screenStyles.subtitle}>
            Todavía no importaste música. Tocá "Importar música" para elegir archivos de audio.
          </Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: theme.spacing.large }}
          renderItem={({ item, index }) => (
            <Pressable style={styles.row} onPress={() => handlePlay(item, index)}>
              <View style={styles.rowText}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {item.artist || 'Artista desconocido'}
                </Text>
              </View>
              <Text style={styles.duration}>{formatDuration(item.durationMs)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: theme.spacing.large,
    gap: theme.spacing.medium,
  },
  importButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.small,
    alignItems: 'center',
  },
  importButtonText: {
    color: theme.colors.darkOnBright,
    fontWeight: '600',
  },
  devButton: {
    alignItems: 'center',
  },
  devButtonText: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.medium,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.surfaceRaised,
  },
  rowText: {
    flex: 1,
  },
  songTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 16,
    fontWeight: '600',
  },
  songArtist: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
    marginTop: 2,
  },
  duration: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
    marginLeft: theme.spacing.small,
  },
});
