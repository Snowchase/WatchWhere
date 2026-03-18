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
import { useQuery } from '@tanstack/react-query'
import { getUpcomingSports, SportsEvent, formatEventTime } from '@watchwhere/core'
import { useAuthStore } from '../../store/useAuthStore'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

const LEAGUES = ['All', 'NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'UFC', 'Tennis']

function SportsEventCard({ event }: { event: SportsEvent }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.league}>{event.league}</Text>
        <Text style={styles.time}>{formatEventTime(event.event_time)}</Text>
      </View>
      <Text style={styles.matchup}>
        {event.home_team} <Text style={styles.vs}>vs</Text> {event.away_team}
      </Text>
      {event.broadcast_ids.length > 0 && (
        <View style={styles.broadcastRow}>
          <Text style={styles.broadcastLabel}>Available on </Text>
          <Text style={styles.broadcastCount}>
            {event.broadcast_ids.length} channel{event.broadcast_ids.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  )
}

export default function SportsScreen() {
  const { user } = useAuthStore()
  const [activeLeague, setActiveLeague] = useState<string>('All')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sports', activeLeague, user?.region],
    queryFn: () =>
      getUpcomingSports(
        {
          region: user?.region ?? 'US',
          league: activeLeague === 'All' ? undefined : activeLeague,
          limit: 50,
        },
        API_BASE_URL,
      ),
    staleTime: 1000 * 60 * 2,
  })

  const events: SportsEvent[] = data?.items ?? []

  const renderEvent: ListRenderItem<SportsEvent> = useCallback(
    ({ item }) => <SportsEventCard event={item} />,
    [],
  )

  const keyExtractor = useCallback((item: SportsEvent) => item.id, [])

  const leagueFilterHeader = (
    <View>
      <FlatList
        data={LEAGUES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(l) => l}
        contentContainerStyle={styles.leagueList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, activeLeague === item && styles.chipActive]}
            onPress={() => setActiveLeague(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeLeague === item }}
          >
            <Text style={[styles.chipText, activeLeague === item && styles.chipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
      <Text style={styles.sectionLabel}>
        {events.length > 0
          ? `${events.length} upcoming event${events.length !== 1 ? 's' : ''}`
          : isLoading
          ? 'Loading…'
          : 'No events found'}
      </Text>
    </View>
  )

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load sports events.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {isLoading && events.length === 0 ? (
        <View>
          {leagueFilterHeader}
          <View style={styles.centered}>
            <ActivityIndicator color="#6366F1" size="large" />
          </View>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={keyExtractor}
          ListHeaderComponent={leagueFilterHeader}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No upcoming events for this league.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  leagueList: { paddingVertical: 12, paddingHorizontal: 0, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  chipText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  league: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  time: { color: '#9CA3AF', fontSize: 12 },
  matchup: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  vs: { color: '#6B7280', fontWeight: '400' },
  broadcastRow: { flexDirection: 'row', alignItems: 'center' },
  broadcastLabel: { color: '#6B7280', fontSize: 12 },
  broadcastCount: { color: '#34D399', fontSize: 12, fontWeight: '600' },
  emptyText: { color: '#6B7280', fontSize: 15 },
  errorText: { color: '#EF4444', fontSize: 15, marginBottom: 12 },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
})
