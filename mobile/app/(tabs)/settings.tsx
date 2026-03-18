import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { useAuthStore } from '../../store/useAuthStore'
import { SUPPORTED_REGIONS } from '@watchwhere/core'

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
    </View>
  )
}

function LoginForm() {
  const { login, register, isLoading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please enter your email and password.')
      return
    }
    clearError()
    if (isRegistering) {
      await register(email.trim(), password)
    } else {
      await login(email.trim(), password)
    }
  }

  return (
    <View style={styles.authContainer}>
      <Text style={styles.authTitle}>{isRegistering ? 'Create Account' : 'Sign In'}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#6B7280"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
        editable={!isLoading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#6B7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={isRegistering ? 'new-password' : 'current-password'}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        editable={!isLoading}
      />
      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isRegistering ? 'Create Account' : 'Sign In'}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.switchModeButton}
        onPress={() => {
          clearError()
          setIsRegistering((v) => !v)
        }}
      >
        <Text style={styles.switchModeText}>
          {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore()
  // Local toggle state (in a real app these would be saved to the API)
  const [notifyEmail, setNotifyEmail] = useState(user?.notify_email ?? false)
  const [notifyPush, setNotifyPush] = useState(user?.notify_push ?? false)

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ])
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LoginForm />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const regionName =
    SUPPORTED_REGIONS.find((r) => r.code === user.region)?.name ?? user.region

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <Row label="Email">
            <Text style={styles.valueText}>{user.email}</Text>
          </Row>
          <Row label="Region">
            <Text style={styles.valueText}>{regionName}</Text>
          </Row>
          <Row label="Subscriptions">
            <Text style={styles.valueText}>
              {user.subscriptions.length > 0
                ? user.subscriptions.join(', ')
                : 'None added'}
            </Text>
          </Row>
        </View>

        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <Row label="Email Alerts">
            <Switch
              value={notifyEmail}
              onValueChange={setNotifyEmail}
              trackColor={{ false: '#374151', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </Row>
          <Row label="Push Notifications">
            <Switch
              value={notifyPush}
              onValueChange={setNotifyPush}
              trackColor={{ false: '#374151', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </Row>
        </View>

        <SectionHeader title="About" />
        <View style={styles.card}>
          <Row label="Version">
            <Text style={styles.valueText}>1.0.0</Text>
          </Row>
          <Row label="API Environment">
            <Text style={styles.valueText}>
              {process.env.EXPO_PUBLIC_API_URL ?? 'localhost:8000'}
            </Text>
          </Row>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  scrollContent: { padding: 20, paddingBottom: 48 },
  sectionHeader: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 24,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  rowLabel: { color: '#D1D5DB', fontSize: 15 },
  rowValue: { flex: 1, alignItems: 'flex-end', marginLeft: 16 },
  valueText: { color: '#9CA3AF', fontSize: 14, textAlign: 'right', flexShrink: 1 },
  logoutButton: {
    marginTop: 32,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  // Auth form
  authContainer: { paddingTop: 32 },
  authTitle: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#F9FAFB',
    fontSize: 15,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  switchModeButton: { marginTop: 20, alignItems: 'center' },
  switchModeText: { color: '#6366F1', fontSize: 14 },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
})
