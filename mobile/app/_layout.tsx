import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#F9FAFB',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#111827' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="title/[id]"
          options={{
            title: '',
            headerBackTitle: 'Back',
            headerTransparent: true,
          }}
        />
      </Stack>
    </QueryClientProvider>
  )
}
