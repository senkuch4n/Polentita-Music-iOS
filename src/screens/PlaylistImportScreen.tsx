import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, screenStyles } from '../theme';
import { PressableScale } from '../components/PressableScale';
import { useRootNavigation } from '../navigation/hooks';
import { usePlaylistImportDetail, usePlaylistImportHistory } from '../hooks/usePlaylistImport';
import { getItemCandidates } from '../db/playlistImportRepository';
import {
  analyzeImportSource,
  cancelImport,
  omitItem,
  pauseImport,
  pickItemCandidate,
  resumeImport,
  retryImportErrors,
  startImport,
  toggleItemSelected,
} from '../playlistImport/coordinator';
import type { PlaylistImportItem } from '../db/types';

const STATE_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  SEARCHING: 'Buscando…',
  PROBABLE_MATCH: 'Coincidencia lista',
  REQUIRES_REVIEW: 'Necesita revisión',
  IN_LIBRARY: 'Ya en tu biblioteca',
  DOWNLOADING: 'Descargando…',
  COMPLETED: 'Lista',
  OMITTED: 'Omitida',
  ERROR: 'Error',
};

export function PlaylistImportScreen() {
  const db = useSQLiteContext();
  const navigation = useRootNavigation();
  const { imports } = usePlaylistImportHistory();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { record, items, reload } = usePlaylistImportDetail(selectedId);
  const [link, setLink] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done' | 'error'>('all');

  async function handleAnalyzeLink() {
    setAnalyzing(true);
    try {
      const id = await analyzeImportSource(db, { link });
      setSelectedId(id);
      setLink('');
    } catch (e: any) {
      Alert.alert('No se pudo analizar', e?.message ?? String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/csv', 'text/plain', 'text/comma-separated-values'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    setAnalyzing(true);
    try {
      const id = await analyzeImportSource(db, { file: result.assets[0] });
      setSelectedId(id);
    } catch (e: any) {
      Alert.alert('No se pudo leer el archivo', e?.message ?? String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleStart() {
    if (!record) return;
    Alert.prompt(
      'Nombre de la lista',
      undefined,
      async (name) => {
        if (!name?.trim()) return;
        await startImport(db, record.id, name.trim());
      },
      'plain-text',
      record.name,
    );
  }

  async function handleChangeCandidate(item: PlaylistImportItem) {
    const candidates = await getItemCandidates(db, item.id);
    if (candidates.length === 0) {
      Alert.alert('Sin candidatos', 'No encontramos resultados alternativos para esta canción.');
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...candidates.map((c) => `${c.title} · ${c.channel} · ${Math.round(c.score * 100)}%`), 'Cancelar'],
        cancelButtonIndex: candidates.length,
      },
      (index) => {
        if (index < candidates.length) pickItemCandidate(db, item.id, candidates[index].id);
      },
    );
  }

  if (!record) {
    return (
      <ScrollView style={screenStyles.screen} contentContainerStyle={{ padding: theme.spacing.large, paddingBottom: theme.spacing.huge }}>
        <Text style={screenStyles.title}>Importar lista</Text>
        <Text style={screenStyles.subtitle}>
          Pegá un enlace de Spotify o YouTube, o elegí un archivo exportado (JSON/CSV/TXT).
        </Text>

        <View style={styles.card}>
          <TextInput
            value={link}
            onChangeText={setLink}
            placeholder="https://open.spotify.com/playlist/…"
            placeholderTextColor={theme.colors.secondaryOnDark}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <PressableScale style={styles.primaryButton} onPress={handleAnalyzeLink} disabled={analyzing || !link.trim()} haptic>
            {analyzing ? <ActivityIndicator color={theme.colors.darkOnBright} /> : <Text style={styles.primaryButtonText}>Analizar</Text>}
          </PressableScale>
        </View>

        <PressableScale style={styles.secondaryButton} onPress={handlePickFile} disabled={analyzing} haptic>
          <Ionicons name="document-outline" size={18} color={theme.colors.primaryOnDark} />
          <Text style={styles.secondaryButtonText}>Elegir archivo</Text>
        </PressableScale>

        {imports.length > 0 && (
          <View style={{ marginTop: theme.spacing.xxl }}>
            <Text style={styles.sectionTitle}>Historial</Text>
            {imports.map((imp, index) => (
              <Animated.View key={imp.id} entering={FadeInDown.delay(index * 40).duration(theme.motion.standard)}>
                <PressableScale style={styles.historyRow} onPress={() => setSelectedId(imp.id)} haptic>
                  <View style={styles.textBlock}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{imp.name}</Text>
                    <Text style={styles.historySubtitle}>{imp.source} · {imp.totalTracks} canciones</Text>
                  </View>
                  <Text style={styles.statePill}>{imp.state}</Text>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  const completed = items.filter((i) => i.state === 'COMPLETED' || i.state === 'IN_LIBRARY').length;
  const errored = items.filter((i) => i.state === 'ERROR' || i.state === 'REQUIRES_REVIEW').length;
  const filteredItems = items.filter((item) => {
    if (filter === 'pending') return item.state === 'PENDING' || item.state === 'SEARCHING' || item.state === 'PROBABLE_MATCH' || item.state === 'DOWNLOADING';
    if (filter === 'done') return item.state === 'COMPLETED' || item.state === 'IN_LIBRARY';
    if (filter === 'error') return item.state === 'ERROR' || item.state === 'REQUIRES_REVIEW';
    return true;
  });

  return (
    <View style={screenStyles.screen}>
      <View style={styles.detailHeader}>
        <Pressable onPress={() => setSelectedId(null)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primaryOnDark} />
        </Pressable>
        <Text style={styles.detailTitle} numberOfLines={1}>{record.name}</Text>
      </View>

      {record.state === 'REVIEW' && (
        <PressableScale style={[styles.primaryButton, styles.startButton]} onPress={handleStart} haptic>
          <Text style={styles.primaryButtonText}>Crear e importar ({items.filter((i) => i.selected).length})</Text>
        </PressableScale>
      )}

      {(record.state === 'RUNNING' || record.state === 'PAUSED') && (
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Progreso ({completed}/{items.length})</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${items.length ? (completed / items.length) * 100 : 0}%` }]} />
          </View>
          <View style={styles.controlsRow}>
            {record.state === 'RUNNING' ? (
              <PressableScale style={styles.controlButton} onPress={() => pauseImport(db, record.id)} haptic>
                <Text style={styles.controlButtonText}>Pausar</Text>
              </PressableScale>
            ) : (
              <PressableScale style={styles.controlButton} onPress={() => resumeImport(db, record.id)} haptic>
                <Text style={styles.controlButtonText}>Reanudar</Text>
              </PressableScale>
            )}
            <PressableScale style={styles.controlButton} onPress={() => cancelImport(db, record.id)} haptic>
              <Text style={[styles.controlButtonText, { color: '#E5766D' }]}>Cancelar</Text>
            </PressableScale>
          </View>
        </View>
      )}

      {(record.state === 'COMPLETED' || record.state === 'PARTIAL' || record.state === 'CANCELLED') && (
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Importación finalizada</Text>
          <Text style={styles.progressSubtitle}>{completed} de {items.length} listas · {errored} con error</Text>
          <View style={styles.controlsRow}>
            {record.localPlaylistId && (
              <PressableScale
                style={styles.controlButton}
                onPress={() => navigation.navigate('PlaylistDetail', { playlistId: record.localPlaylistId!, playlistName: record.name })}
                haptic
              >
                <Text style={styles.controlButtonText}>Abrir lista</Text>
              </PressableScale>
            )}
            {errored > 0 && (
              <PressableScale style={styles.controlButton} onPress={() => retryImportErrors(db, record.id)} haptic>
                <Text style={styles.controlButtonText}>Reintentar pendientes</Text>
              </PressableScale>
            )}
          </View>
        </View>
      )}

      {record.state !== 'REVIEW' && (
        <View style={styles.filterRow}>
          {(['all', 'pending', 'done', 'error'] as const).map((key) => (
            <Pressable key={key} style={[styles.filterChip, filter === key && styles.filterChipActive]} onPress={() => setFilter(key)}>
              <Text style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>
                {key === 'all' ? 'Todos' : key === 'pending' ? 'Pendientes' : key === 'done' ? 'Completados' : 'Con error'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.huge }}>
        {filteredItems.map((item, index) => (
          <Animated.View key={item.id} entering={FadeInDown.delay(index * 30).duration(theme.motion.quick)}>
            <ImportItemRow
              item={item}
              editable={record.state === 'REVIEW'}
              onToggleSelected={() => toggleItemSelected(db, item.id, !item.selected)}
              onChangeCandidate={() => handleChangeCandidate(item)}
              onOmit={() => omitItem(db, item.id)}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

function ImportItemRow({
  item,
  editable,
  onToggleSelected,
  onChangeCandidate,
  onOmit,
}: {
  item: PlaylistImportItem;
  editable: boolean;
  onToggleSelected: () => void;
  onChangeCandidate: () => void;
  onOmit: () => void;
}) {
  const terminal = item.state === 'COMPLETED' || item.state === 'OMITTED' || item.state === 'IN_LIBRARY';
  const canReview = item.state === 'REQUIRES_REVIEW' || item.state === 'PROBABLE_MATCH';

  return (
    <View style={styles.itemRow}>
      {editable && !terminal && (
        <Pressable hitSlop={8} onPress={onToggleSelected}>
          <Ionicons
            name={item.selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={item.selected ? theme.colors.accent : theme.colors.secondaryOnDark}
          />
        </Pressable>
      )}
      <View style={styles.textBlock}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemSubtitle} numberOfLines={1}>{item.artist || 'Artista desconocido'}</Text>
        <Text style={styles.itemState}>{STATE_LABEL[item.state] ?? item.state}</Text>
        {item.state === 'DOWNLOADING' && (
          <View style={styles.itemProgressTrack}>
            <View style={styles.itemProgressFill} />
          </View>
        )}
      </View>
      {canReview && !terminal && (
        <View style={styles.itemActions}>
          <Pressable hitSlop={6} onPress={onChangeCandidate}>
            <Text style={styles.itemActionText}>Cambiar</Text>
          </Pressable>
          <Pressable hitSlop={6} onPress={onOmit}>
            <Text style={[styles.itemActionText, { color: '#E5766D' }]}>Omitir</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.large,
    padding: theme.spacing.medium,
    borderRadius: theme.radii.medium,
    backgroundColor: theme.colors.surfaceRaised,
    gap: theme.spacing.small,
  },
  input: {
    color: theme.colors.primaryOnDark,
    fontSize: 15,
    paddingVertical: theme.spacing.small,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.small,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.darkOnBright,
    fontWeight: '700',
  },
  startButton: {
    marginHorizontal: theme.spacing.large,
    marginTop: theme.spacing.medium,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primaryOnDark + '33',
  },
  secondaryButtonText: {
    color: theme.colors.primaryOnDark,
    fontWeight: '600',
  },
  sectionTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing.medium,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
  },
  historyTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 15,
    fontWeight: '600',
  },
  historySubtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    marginTop: 2,
  },
  statePill: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
    padding: theme.spacing.large,
  },
  detailTitle: {
    flex: 1,
    color: theme.colors.primaryOnDark,
    fontSize: 18,
    fontWeight: '700',
  },
  progressCard: {
    marginHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.medium,
    padding: theme.spacing.medium,
    borderRadius: theme.radii.medium,
    backgroundColor: theme.colors.surfaceRaised,
    gap: theme.spacing.small,
  },
  progressTitle: {
    color: theme.colors.primaryOnDark,
    fontWeight: '700',
  },
  progressSubtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primaryOnDark + '1A',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: theme.colors.accent,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: theme.spacing.small,
  },
  controlButton: {
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
  },
  controlButtonText: {
    color: theme.colors.primaryOnDark,
    fontWeight: '600',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.small,
    paddingHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.small,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.small,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceRaised,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
  },
  filterChipText: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: theme.colors.darkOnBright,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.small,
  },
  textBlock: {
    flex: 1,
  },
  itemTitle: {
    color: theme.colors.primaryOnDark,
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
  },
  itemState: {
    color: theme.colors.accent,
    fontSize: 11,
    marginTop: 2,
  },
  itemProgressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.primaryOnDark + '1A',
    marginTop: theme.spacing.xxs,
    overflow: 'hidden',
  },
  itemProgressFill: {
    height: 3,
    width: '60%',
    backgroundColor: theme.colors.accent,
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: theme.spacing.xxs,
  },
  itemActionText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
});
