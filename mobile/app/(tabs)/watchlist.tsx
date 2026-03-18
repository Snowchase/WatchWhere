import React, { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ListRenderItem,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWatchlist, removeFromWatchlist, WatchlistItem } from '@watchwhere/core'
import { useAuthStore } from '../../store/useAuthStore'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

function WatchlistCard({
  item,
  onPress,
  onRemove,
}: {
  item: WatchlistItem
  onPress: () => void
  onRemove: () => void
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {item.title.poster_url ? (
        <Image source={{ uri: item.title.poster_url }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={styles.posterPlaceholderText}>🎬</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.titleText} numberOfLines={2}>
          {item.title.title}
        </Text>
        <Text style={styles.meta}>
          {item.title.year ?? '—'} · {item.title.type.replace('_', ' ')}
        </Text>
        {item.title.genres.length > 0 && (
          <Text style={styles.genres} numberOfLines={1}>
            {item.title.genres.slice(0, 3).join(' · ')}
          </Text>
        )}
        <View style={styles.alertRow}>
          {item.alert_on_add && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Alert: Added</Text>
            </View>
          )}
          {item.alert_on_remove && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <Text style={styles.badgeText}>Alert: Leaving</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={`Remove ${item.title.title} from watchlist`}
      >
        <Text style={styles.removeIcon}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

function UnauthenticatedState({ onLogin }: { onLogin: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>Your Watchlist</Text>
      <Text style={styles.emptySubtitle}>
        Sign in to save titles and get notified when they leave a streaming service.
      </Text>
      <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
        <Text style={styles.loginButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function WatchlistScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { token, user } = useAuthStore()

  const { data: watchlist = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: () => getWatchlist(token!, API_BASE_URL),
    enabled: !!token,
    staleTime: 1000 * 60,
  })

  const removeMutation = useMutation({
    mutationFn: (titleId: string) => removeFromWatchlist(titleId, token!, API_BASE_URL),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] })
    },
    onError: () => {
      Alert.alert('Error', 'Could not remove title. Please try again.')
    },
  })

  const handleRemove = useCallback(
    (item: WatchlistItem) => {
      Alert.alert(
        'Remove from Watchlist',
        `Remove "${item.title.title}" from your watchlist?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeMutation.mutate(item.title.id),
          },
        ],
      )
    },
    [removeMutation],
  )

  const renderItem: ListRenderItem<WatchlistItem> = useCallback(
    ({ item }) => (
      <WatchlistCard
        item={item}
        onPress={() => router.push(`/title/${item.title.id}`)}
        onRemove={() => handleRemove(item)}
      />
    ),
    [router, handleRemove],
  )

  const keyExtractor = useCallback((item: WatchlistItem) => item.id, [])

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <UnauthenticatedState onLogin={() => router.push('/settings')} />
      </SafeAreaView>
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color="#6366F1" size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load watchlist.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={watchlist}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          watchlist.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySubtitle}>
              Search for a movie or show and add it to your watchlist.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  listContent: { padding: 16, paddingBottom: 32 },
  listContentEmpty: { flex: 1 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  poster: { width: 72, height: 108 },
  posterPlaceholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderText: { fontSize: 28 },
  cardBody: { flex: 1, padding: 12, paddingRight: 8 },
  titleText: { color: '#F9FAFB', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  meta: { color: '#9CA3AF', fontSize: 12, marginBottom: 4, textTransform: 'capitalize' },
  genres: { color: '#6B7280', fontSize: 12, marginBottom: 8 },
  alertRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeWarning: { backgroundColor: '#3B1F0A' },
  badgeText: { color: '#93C5FD', fontSize: 11, fontWeight: '500' },
  removeButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 14,
  },
  removeIcon: { color: '#6B7280', fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loginButton: {
    marginTop: 24,
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#EF4444', fontSize: 15, marginBottom: 12 },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
})
