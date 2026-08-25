import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { theme, screenStyles } from '../theme';
import { getSongById, updateSongMetadata } from '../db/songsRepository';
import { useRootNavigation } from '../navigation/hooks';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

interface Props {
  route: RouteProp<RootStackParamList, 'SongEditor'>;
}

export function SongEditorScreen({ route }: Props) {
  const songId = Number(route.params.songId);
  const db = useSQLiteContext();
  const navigation = useRootNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [trackNumber, setTrackNumber] = useState('');

  useEffect(() => {
    getSongById(db, songId).then((song) => {
      if (song) {
        setTitle(song.title);
        setArtist(song.artist);
        setAlbumName(song.albumName);
        setGenre(song.genre);
        setYear(song.year ? String(song.year) : '');
        setTrackNumber(song.trackNumber ? String(song.trackNumber) : '');
      }
      setLoading(false);
    });
  }, [db, songId]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateSongMetadata(db, songId, {
        title: title.trim(),
        artist: artist.trim(),
        albumName: albumName.trim(),
        genre: genre.trim(),
        year: year.trim() ? parseInt(year, 10) : null,
        trackNumber: trackNumber.trim() ? parseInt(trackNumber, 10) : null,
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={screenStyles.screen}>
        <ActivityIndicator style={{ marginTop: theme.spacing.xxl }} color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={styles.content}>
      <Field label="Título" value={title} onChangeText={setTitle} />
      <Field label="Artista" value={artist} onChangeText={setArtist} />
      <Field label="Álbum" value={albumName} onChangeText={setAlbumName} />
      <Field label="Género" value={genre} onChangeText={setGenre} />
      <View style={styles.row}>
        <Field label="Año" value={year} onChangeText={setYear} keyboardType="number-pad" style={{ flex: 1 }} />
        <Field
          label="N° de pista"
          value={trackNumber}
          onChangeText={setTrackNumber}
          keyboardType="number-pad"
          style={{ flex: 1 }}
        />
      </View>
      <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={theme.colors.darkOnBright} />
        ) : (
          <Text style={styles.saveButtonText}>Guardar cambios</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor={theme.colors.secondaryOnDark}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.large,
    gap: theme.spacing.large,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.medium,
  },
  field: {
    gap: theme.spacing.xs,
  },
  fieldLabel: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radii.medium,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    color: theme.colors.primaryOnDark,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.medium,
    alignItems: 'center',
    marginTop: theme.spacing.medium,
  },
  saveButtonText: {
    color: theme.colors.darkOnBright,
    fontWeight: '700',
    fontSize: 16,
  },
});
