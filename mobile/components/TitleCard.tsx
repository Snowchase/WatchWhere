import React from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { Title } from '@watchwhere/core'

const TYPE_EMOJI: Record<string, string> = {
  movie: '🎬',
  tv_show: '📺',
  anime: '🎌',
  sport: '🏆',
}

interface TitleCardProps {
  title: Title
  onPress: () => void
}

export default function TitleCard({ title, onPress }: TitleCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${title.title}${title.year ? `, ${title.year}` : ''}`}
    >
      {title.poster_url ? (
        <Image
          source={{ uri: title.poster_url }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.posterEmoji}>{TYPE_EMOJI[title.type] ?? '🎬'}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.titleText} numberOfLines={2}>
          {title.title}
        </Text>
        <Text style={styles.metaText}>
          {title.year ? `${title.year} · ` : ''}
          {title.type.replace('_', ' ')}
        </Text>
        {title.genres.length > 0 && (
          <Text style={styles.genreText} numberOfLines={1}>
            {title.genres.slice(0, 2).join(', ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const CARD_WIDTH = '48.5%'

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  posterFallback: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterEmoji: { fontSize: 40 },
  info: { padding: 8 },
  titleText: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
    lineHeight: 18,
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 11,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  genreText: { color: '#6B7280', fontSize: 11 },
})
