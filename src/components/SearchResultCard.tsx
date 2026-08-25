import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ArtworkView } from './ArtworkView';
import { PressableScale } from './PressableScale';
import { formatDuration } from '../utils/format';
import type { SearchResultItem } from '../native/pythonBridge';
import type { Download } from '../db/types';

const ART_SIZE = 60;

interface SearchResultCardProps {
  item: SearchResultItem;
  inLibrary: boolean;
  download?: Download;
  isSaved: boolean;
  isPreviewing: boolean;
  previewLoading: boolean;
  onToggleSave: () => void;
  onPreview: () => void;
  onDownload: () => void;
}

export function SearchResultCard({
  item,
  inLibrary,
  download,
  isSaved,
  isPreviewing,
  previewLoading,
  onToggleSave,
  onPreview,
  onDownload,
}: SearchResultCardProps) {
  const downloadBusy = download?.status === 'PENDING' || download?.status === 'DOWNLOADING';
  const downloadDone = download?.status === 'COMPLETED' || inLibrary;
  const downloadFailed = download?.status === 'FAILED' || download?.status === 'CANCELLED';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ArtworkView uri={item.thumbnail} seed={item.id} size={ART_SIZE} radius={theme.radii.small} />
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{item.channel}</Text>
          <Text style={styles.meta} numberOfLines={1}>{formatDuration(item.durationMs)}</Text>
        </View>
        <PressableScale hitSlop={8} onPress={onToggleSave} style={styles.bookmarkButton}>
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved ? theme.colors.accent : theme.colors.secondaryOnDark} />
        </PressableScale>
      </View>

      <View style={styles.buttonRow}>
        <PressableScale style={styles.previewButton} onPress={onPreview} haptic>
          {previewLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primaryOnDark} />
          ) : (
            <Ionicons name={isPreviewing ? 'pause' : 'play'} size={16} color={theme.colors.primaryOnDark} />
          )}
          <Text style={styles.previewButtonText}>{isPreviewing ? 'Reproduciendo' : 'Vista previa'}</Text>
        </PressableScale>

        <PressableScale
          style={[styles.downloadButton, downloadDone && styles.downloadButtonDone]}
          onPress={onDownload}
          haptic
          disabled={downloadBusy || downloadDone}
        >
          {downloadBusy ? (
            <ActivityIndicator size="small" color={theme.colors.darkOnBright} />
          ) : (
            <Ionicons
              name={downloadDone ? 'checkmark' : downloadFailed ? 'refresh' : 'download-outline'}
              size={16}
              color={theme.colors.darkOnBright}
            />
          )}
          <Text style={styles.downloadButtonText}>
            {downloadDone ? 'En biblioteca' : downloadBusy ? 'Descargando' : downloadFailed ? 'Reintentar' : 'Descargar'}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

export function SearchResultCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.skeletonBlock, { width: ART_SIZE, height: ART_SIZE, borderRadius: theme.radii.small }]} />
        <View style={styles.textBlock}>
          <View style={[styles.skeletonBlock, { width: 176, height: 14, opacity: 0.62, marginBottom: theme.spacing.xs }]} />
          <View style={[styles.skeletonBlock, { width: 112, height: 11, opacity: 0.46 }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.large,
    marginBottom: theme.spacing.medium,
    padding: theme.spacing.medium,
    borderRadius: theme.radii.medium,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primaryOnDark + '1F',
    gap: theme.spacing.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.colors.primaryOnDark,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.colors.secondaryOnDark,
    fontSize: 13,
  },
  meta: {
    color: theme.colors.disabledOnDark,
    fontSize: 12,
  },
  bookmarkButton: {
    padding: theme.spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.small,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.small,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primaryOnDark + '33',
  },
  previewButtonText: {
    color: theme.colors.primaryOnDark,
    fontSize: 13,
    fontWeight: '600',
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.small,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  downloadButtonDone: {
    backgroundColor: theme.colors.accent + '55',
  },
  downloadButtonText: {
    color: theme.colors.darkOnBright,
    fontSize: 13,
    fontWeight: '700',
  },
  skeletonBlock: {
    backgroundColor: theme.colors.primaryOnDark,
    borderRadius: theme.radii.small,
  },
});
