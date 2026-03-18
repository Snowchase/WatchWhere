import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { searchTitles, browseTitles, Title, ContentType } from '@watchwhere/core'
import SearchBar from '../../components/SearchBar'
import TitleCard from '../../components/TitleCard'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

const CONTENT_TYPE_FILTERS: { label: string; value: ContentType | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Movies', value: 'movie' },
  { label: 'TV', value: 'tv_show' },
  { label: 'Anime', value: 'anime' },
]

export default function HomeScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState<ContentType | undefined>(undefined)

  const isSearching = query.trim().length > 0

  const searchQuery = useQuery({
    queryKey: ['search', query, activeType],
    queryFn: () =>
      searchTitles({ q: query.trim(), type: activeType, limit: 30 }, API_BASE_URL),
    enabled: isSearching,
    staleTime: 1000 * 30,
  })

  const browseQuery = useQuery({
    queryKey: ['browse', activeType],
    queryFn: () =>
      browseTitles({ type: activeType, limit: 30, sort: 'created_at', order: 'desc' }, API_BASE_URL),
    enabled: !isSearching,
    staleTime: 1000 * 60 * 5,
  })

  const activeQuery = isSearching ? searchQuery : browseQuery
  const titles: Title[] = activeQuery.data?.items ?? []

  const handleTitlePress = useCallback(
    (title: Title) => router.push(`/title/${title.id}`),
    [router],
  )

  const renderItem: ListRenderItem<Title> = useCallback(
    ({ item }) => <TitleCard title={item} onPress={() => handleTitlePress(item)} />,
    [handleTitlePress],
  )

  const keyExtractor = useCallback((item: Title) => item.id, [])

  const listHeader = (
    <View>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search movies, shows, anime…"
      />
      <View style={styles.filters}>
        {CONTENT_TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.chip, activeType === f.value && styles.chipActive]}
            onPress={() => setActiveType(f.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeType === f.value }}
          >
            <Text style={[styles.chipText, activeType === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {!isSearching && (
        <Text style={styles.sectionLabel}>Recently Added</Text>
      )}
      {isSearching && titles.length === 0 && !activeQuery.isLoading && (
        <Text style={styles.emptyText}>No results for "{query}"</Text>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {activeQuery.isLoading && titles.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6366F1" size="large" />
        </View>
      ) : activeQuery.isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load titles.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => activeQuery.refetch()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={titles}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { justifyContent: 'space-between' },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    marginBottom: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  chipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  chipText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },
  sectionLabel: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 48,
    fontSize: 15,
  },
  errorText: { color: '#EF4444', fontSize: 15, marginBottom: 12 },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
})
