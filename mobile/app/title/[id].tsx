import React, { useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  SafeAreaView,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTitleById,
  getTitleAvailability,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  formatStreamType,
  formatPrice,
  formatAvailableUntil,
  isLeavingSoon,
  Title,
  AvailabilityEntry,
} from '@watchwhere/core'
import { useAuthStore } from '../../store/useAuthStore'
import AvailabilityItem from '../../components/AvailabilityItem'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

function PosterSection({ title }: { title: Title }) {
  return (
    <View style={styles.posterSection}>
      {title.poster_url ? (
        <Image
          source={{ uri: title.poster_url }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={styles.posterPlaceholderText}>🎬</Text>
        </View>
      )}
      <View style={styles.posterOverlay} />
    </View>
  )
}

export default function TitleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { token, user } = useAuthStore()

  const titleQuery = useQuery({
    queryKey: ['title', id],
    queryFn: () => getTitleById(id, API_BASE_URL),
    staleTime: 1000 * 60 * 10,
  })

  const availQuery = useQuery({
    queryKey: ['availability', id, user?.region ?? 'US'],
    queryFn: () => getTitleAvailability(id, user?.region ?? 'US', API_BASE_URL),
    staleTime: 1000 * 60 * 5,
  })

  const watchlistQuery = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: () => getWatchlist(token!, API_BASE_URL),
    enabled: !!token,
    staleTime: 1000 * 60,
  })

  const isInWatchlist = watchlistQuery.data?.some((w) => w.title.id === id) ?? false

  const addMutation = useMutation({
    mutationFn: () => addToWatchlist(id, token!, API_BASE_URL),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] })
    },
    onError: () => Alert.alert('Error', 'Could not add to watchlist.'),
  })

  const removeMutation = useMutation({
    mutationFn: () => removeFromWatchlist(id, token!, API_BASE_URL),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] })
    },
    onError: () => Alert.alert('Error', 'Could not remove from watchlist.'),
  })

  const handleWatchlistToggle = useCallback(() => {
    if (!token) {
      Alert.alert('Sign In Required', 'Sign in to add titles to your watchlist.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/settings') },
      ])
      return
    }
    if (isInWatchlist) {
      removeMutation.mutate()
    } else {
      addMutation.mutate()
    }
  }, [token, isInWatchlist, addMutation, removeMutation, router])

  const handleOpenLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open this link.'))
  }, [])

  if (titleQuery.isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#6366F1" size="large" />
      </SafeAreaView>
    )
  }

  if (titleQuery.isError || !titleQuery.data) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Could not load title.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => titleQuery.refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const title = titleQuery.data
  const availability: AvailabilityEntry[] = availQuery.data?.availability ?? []
  const isMutating = addMutation.isPending || removeMutation.isPending

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <PosterSection title={title} />

      <View style={styles.content}>
        {/* Title & meta */}
        <Text style={styles.titleText}>{title.title}</Text>
        <View style={styles.metaRow}>
          {title.year && <Text style={styles.metaChip}>{title.year}</Text>}
          <Text style={styles.metaChip}>{title.type.replace('_', ' ')}</Text>
          {title.genres.slice(0, 2).map((g) => (
            <Text key={g} style={styles.metaChip}>{g}</Text>
          ))}
        </View>

        {/* Description */}
        {title.description ? (
          <Text style={styles.description}>{title.description}</Text>
        ) : null}

        {/* Watchlist button */}
        <TouchableOpacity
          style={[styles.watchlistButton, isInWatchlist && styles.watchlistButtonActive]}
          onPress={handleWatchlistToggle}
          disabled={isMutating}
          accessibilityRole="button"
          accessibilityLabel={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isMutating ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.watchlistButtonText}>
              {isInWatchlist ? '✓  In Watchlist' : '+  Add to Watchlist'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Availability */}
        <Text style={styles.sectionHeader}>Where to Watch</Text>
        {availQuery.isLoading ? (
          <ActivityIndicator color="#6366F1" style={{ marginTop: 16 }} />
        ) : availability.length === 0 ? (
          <Text style={styles.emptyAvail}>
            No streaming availability found in your region ({user?.region ?? 'US'}).
          </Text>
        ) : (
          availability.map((entry, idx) => (
            <AvailabilityItem
              key={`${entry.platform_slug}-${entry.stream_type}-${idx}`}
              entry={entry}
              onPress={() => handleOpenLink(entry.content_url)}
            />
          ))
        )}

        {/* External IDs */}
        {(title.imdb_id || title.tmdb_id) && (
          <>
            <Text style={styles.sectionHeader}>External Links</Text>
            <View style={styles.externalLinks}>
              {title.imdb_id && (
                <TouchableOpacity
                  style={styles.externalLink}
                  onPress={() =>
                    handleOpenLink(`https://www.imdb.com/title/${title.imdb_id}`)
                  }
                >
                  <Text style={styles.externalLinkText}>IMDb</Text>
                </TouchableOpacity>
              )}
              {title.tmdb_id && (
                <TouchableOpacity
                  style={styles.externalLink}
                  onPress={() =>
                    handleOpenLink(
                      `https://www.themoviedb.org/movie/${title.tmdb_id}`,
                    )
                  }
                >
                  <Text style={styles.externalLinkText}>TMDB</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterSection: { position: 'relative', height: 320 },
  poster: { width: '100%', height: 320 },
  posterPlaceholder: {
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderText: { fontSize: 64 },
  posterOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    // gradient-like fade from transparent to background
    backgroundColor: 'transparent',
  },
  content: { padding: 20, paddingBottom: 48 },
  titleText: {
    color: '#F9FAFB',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    lineHeight: 32,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  metaChip: {
    backgroundColor: '#1F2937',
    color: '#9CA3AF',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    textTransform: 'capitalize',
    borderWidth: 1,
    borderColor: '#374151',
  },
  description: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  watchlistButton: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 28,
  },
  watchlistButtonActive: { backgroundColor: '#374151' },
  watchlistButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sectionHeader: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
  },
  emptyAvail: { color: '#6B7280', fontSize: 14, marginBottom: 24 },
  externalLinks: { flexDirection: 'row', gap: 12 },
  externalLink: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  externalLinkText: { color: '#6366F1', fontWeight: '600', fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 15, marginBottom: 12 },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
})
