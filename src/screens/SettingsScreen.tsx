import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import Constants from 'expo-constants';
import { theme, screenStyles } from '../theme';
import { exportBackup, importBackup } from '../db/backupRepository';

export function SettingsScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState({ songs: 0, playlists: 0, bytes: 0 });
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const reloadStats = useCallback(async () => {
    const songRow = await db.getFirstAsync<{ count: number; bytes: number }>(
      'SELECT COUNT(*) as count, COALESCE(SUM(fileSize), 0) as bytes FROM songs WHERE isAvailable = 1',
    );
    const playlistRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM playlists');
    setStats({
      songs: songRow?.count ?? 0,
      playlists: playlistRow?.count ?? 0,
      bytes: songRow?.bytes ?? 0,
    });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reloadStats();
    }, [reloadStats]),
  );

  async function handleExport() {
    setBusy('export');
    try {
      const payload = await exportBackup(db);
      const fileName = `polentita-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File(Paths.cache, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(payload, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Guardar copia de seguridad' });
      } else {
        Alert.alert('Copia creada', `Se guardó en ${file.uri}`);
      }
    } catch (error: any) {
      Alert.alert('Error al exportar', error?.message ?? String(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleImport() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled) return;

    Alert.alert(
      'Restaurar copia de seguridad',
      'Esto reemplaza tu biblioteca, listas e historial actuales. Las canciones cuyos archivos ya no estén en el dispositivo van a aparecer como no disponibles.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            setBusy('import');
            try {
              const file = new File(result.assets[0].uri);
              const payload = await file.json();
              await importBackup(db, payload);
              await reloadStats();
              Alert.alert('Listo', 'Tu biblioteca fue restaurada.');
            } catch (error: any) {
              Alert.alert('Error al restaurar', error?.message ?? String(error));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={styles.content}>
      <Section title="Biblioteca">
        <StatRow icon="musical-notes" label="Canciones" value={String(stats.songs)} />
        <StatRow icon="list" label="Listas" value={String(stats.playlists)} />
        <StatRow icon="server" label="Espacio usado" value={formatBytes(stats.bytes)} />
      </Section>

      <Section title="Copia de seguridad">
        <Text style={styles.sectionHint}>
          Guarda tu biblioteca, listas e historial. No incluye los archivos de audio en sí.
        </Text>
        <Pressable style={styles.actionRow} onPress={handleExport} disabled={busy !== null}>
          <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.actionText}>{busy === 'export' ? 'Exportando…' : 'Exportar copia'}</Text>
        </Pressable>
        <Pressable style={styles.actionRow} onPress={handleImport} disabled={busy !== null}>
          <Ionicons name="cloud-download-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.actionText}>{busy === 'import' ? 'Restaurando…' : 'Restaurar copia'}</Text>
        </Pressable>
      </Section>

      <Section title="Acerca de">
        <StatRow icon="information-circle" label="Versión" value={Constants.expoConfig?.version ?? '1.0.0'} />
        <Pressable
          style={styles.actionRow}
          onPress={() => Linking.openURL('https://github.com/polen-tita/Polentita-Music')}
        >
          <Ionicons name="logo-github" size={20} color={theme.colors.accent} />
          <Text style={styles.actionText}>Ver el proyecto en GitHub</Text>
        </Pressable>
        <Text style={styles.sectionHint}>
          Polentita Music no necesita una cuenta, no muestra publicidad y no incluye seguimiento de actividad. Tus
          archivos permanecen en tu dispositivo.
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function StatRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.actionRow}>
      <Ionicons name={icon} size={20} color={theme.colors.secondaryOnDark} />
      <Text style={styles.actionText}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.large,
    gap: theme.spacing.xl,
  },
  section: {
    gap: theme.spacing.small,
  },
  sectionTitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionCard: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radii.medium,
    overflow: 'hidden',
  },
  sectionHint: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.medium,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.background,
  },
  actionText: {
    flex: 1,
    color: theme.colors.primaryOnDark,
    fontSize: 15,
  },
  statValue: {
    color: theme.colors.secondaryOnDark,
    fontSize: 15,
  },
});
