import React from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import {
  AvailabilityEntry,
  formatStreamType,
  formatPrice,
  formatAvailableUntil,
  isLeavingSoon,
} from '@watchwhere/core'

interface AvailabilityItemProps {
  entry: AvailabilityEntry
  onPress: () => void
}

const STREAM_TYPE_COLORS: Record<string, string> = {
  subscription: '#6366F1',
  free: '#10B981',
  broadcast: '#F59E0B',
  rent: '#3B82F6',
  buy: '#8B5CF6',
}

export default function AvailabilityItem({ entry, onPress }: AvailabilityItemProps) {
  const leavingSoon = isLeavingSoon(entry.available_until)
  const leaveLabel = formatAvailableUntil(entry.available_until)
  const streamColor = STREAM_TYPE_COLORS[entry.stream_type] ?? '#6B7280'

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="link"
      accessibilityLabel={`Watch on ${entry.platform} — ${formatStreamType(entry.stream_type)}`}
    >
      {/* Logo / platform name */}
      <View style={styles.logoContainer}>
        {entry.logo_url ? (
          <Image source={{ uri: entry.logo_url }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoFallbackText}>
              {entry.platform.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Platform name + stream type */}
      <View style={styles.body}>
        <Text style={styles.platformName}>{entry.platform}</Text>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: streamColor + '22', borderColor: streamColor + '55' }]}>
            <Text style={[styles.tagText, { color: streamColor }]}>
              {formatStreamType(entry.stream_type)}
            </Text>
          </View>
          {leavingSoon && leaveLabel && (
            <View style={styles.leavingTag}>
              <Text style={styles.leavingTagText}>{leaveLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Price + open arrow */}
      <View style={styles.right}>
        <Text style={styles.price}>{formatPrice(entry.price)}</Text>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  logoContainer: { width: 48, height: 48, marginRight: 12 },
  logo: { width: 48, height: 48, borderRadius: 8 },
  logoFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
  body: { flex: 1 },
  platformName: { color: '#F9FAFB', fontSize: 14, fontWeight: '600', marginBottom: 5 },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
  leavingTag: {
    backgroundColor: '#7C2D1222',
    borderWidth: 1,
    borderColor: '#EF444455',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leavingTagText: { color: '#EF4444', fontSize: 11, fontWeight: '600' },
  right: { alignItems: 'flex-end', marginLeft: 8 },
  price: { color: '#D1D5DB', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  arrow: { color: '#6B7280', fontSize: 18, lineHeight: 18 },
})
