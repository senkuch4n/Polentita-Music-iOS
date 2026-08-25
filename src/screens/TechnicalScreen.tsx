import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { theme, screenStyles } from '../theme';
import { getSongById } from '../db/songsRepository';
import { formatDuration } from '../utils/format';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import type { Song } from '../db/types';

interface Props {
  route: RouteProp<RootStackParamList, 'Technical'>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TechnicalScreen({ route }: Props) {
  const songId = Number(route.params.songId);
  const db = useSQLiteContext();
  const [song, setSong] = useState<Song | null>(null);

  useEffect(() => {
    getSongById(db, songId).then(setSong);
  }, [db, songId]);

  if (!song) {
    return (
      <View style={screenStyles.screen}>
        <ActivityIndicator style={{ marginTop: theme.spacing.xxl }} color={theme.colors.accent} />
      </View>
    );
  }

  const rows: [string, string][] = [
    ['Archivo original', song.originalFileName],
    ['Nombre en biblioteca', song.displayFileName],
    ['Tipo MIME', song.mimeType],
    ['Tamaño', formatBytes(song.fileSize)],
    ['Duración', formatDuration(song.durationMs)],
    ['Origen', song.sourceType === 'IMPORTED' ? 'Importado' : song.sourceType === 'DOWNLOADED' ? 'Descargado' : 'Escaneado'],
    ['Agregado', new Date(song.dateAdded).toLocaleString()],
    ['Reproducciones', String(song.playCount)],
    ['Checksum (SHA-256)', song.checksum],
  ];

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={styles.content}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value} selectable numberOfLines={2}>
            {value}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.large,
  },
  row: {
    paddingVertical: theme.spacing.medium,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.surfaceRaised,
  },
  label: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    color: theme.colors.primaryOnDark,
    fontSize: 15,
    marginTop: 4,
  },
});
