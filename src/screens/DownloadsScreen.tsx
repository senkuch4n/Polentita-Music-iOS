import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { theme, screenStyles } from '../theme';
import { ArtworkView } from '../components/ArtworkView';
import { formatBytes } from '../utils/format';
import { useDownloads } from '../hooks/useDownloads';
import { cancelDownload } from '../downloads/downloadManager';
import { deleteDownload } from '../db/downloadsRepository';
import { useRootNavigation } from '../navigation/hooks';
import type { Download } from '../db/types';

const STATUS_LABEL: Record<Download['status'], string> = {
  PENDING: 'En cola',
  DOWNLOADING: 'Descargando…',
  COMPLETED: 'Completada',
  FAILED: 'Falló',
  CANCELLED: 'Cancelada',
};

function DownloadRow({ download, onAction }: { download: Download; onAction: () => void }) {
  const isActive = download.status === 'PENDING' || download.status === 'DOWNLOADING';
  const subtitleParts = [STATUS_LABEL[download.status]];
  if (download.status === 'DOWNLOADING' && download.bytesDownloaded > 0) {
    subtitleParts.push(formatBytes(download.bytesDownloaded));
  }
  if (download.status === 'FAILED' && download.errorMessage) {
    subtitleParts.push(download.errorMessage);
  }

  return (
    <View style={styles.row}>
      <ArtworkView uri={download.thumbnail} seed={download.videoId} size={theme.coverSize.row} />
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>{download.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitleParts.join(' · ')}</Text>
      </View>
      <Pressable hitSlop={8} onPress={onAction} style={styles.actionButton}>
        <Ionicons
          name={isActive ? 'close-circle-outline' : 'trash-outline'}
          size={20}
          color={theme.colors.secondaryOnDark}
        />
      </Pressable>
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={32} color={theme.colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={screenStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function DownloadsNewScreen() {
  const db = useSQLiteContext();
  const navigation = useRootNavigation();
  const { active } = useDownloads();

  return (
    <View style={screenStyles.screen}>
      <Pressable style={styles.historyLink} onPress={() => navigation.navigate('DownloadsHistory')}>
        <Text style={styles.historyLinkText}>Ver historial</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
      </Pressable>
      {active.length === 0 ? (
        <EmptyState
          icon="download-outline"
          title="No hay descargas en curso"
          subtitle="Buscá música desde la pestaña Buscar para descargarla."
        />
      ) : (
        <FlatList
          data={active}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <DownloadRow download={item} onAction={() => cancelDownload(db, item)} />
          )}
        />
      )}
    </View>
  );
}

export function DownloadsHistoryScreen() {
  const db = useSQLiteContext();
  const { history } = useDownloads();

  return (
    <View style={screenStyles.screen}>
      {history.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="Sin historial todavía"
          subtitle="Las descargas completadas, fallidas o canceladas aparecen acá."
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <DownloadRow download={item} onAction={() => deleteDownload(db, item.id)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.medium,
  },
  historyLinkText: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.large,
    gap: theme.spacing.medium,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
    marginTop: 2,
  },
  actionButton: {
    padding: theme.spacing.xs,
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
});
