import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'

// Minimal inline icon components — replace with expo-vector-icons if added to project
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Search: '🔍',
    Sports: '🏆',
    Watchlist: '📋',
    Settings: '⚙️',
  }
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.emoji}>{icons[label] ?? '•'}</Text>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  emoji: { fontSize: 18 },
  label: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  labelFocused: { color: '#6366F1' },
})

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#F9FAFB',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: '#374151',
          height: 80,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'WatchWhere',
          tabBarIcon: ({ focused }) => <TabIcon label="Search" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sports"
        options={{
          title: 'Sports',
          tabBarIcon: ({ focused }) => <TabIcon label="Sports" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'My Watchlist',
          tabBarIcon: ({ focused }) => <TabIcon label="Watchlist" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
