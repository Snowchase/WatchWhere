import React, { useRef } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native'

interface SearchBarProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChangeText, placeholder, ...rest }: SearchBarProps) {
  const inputRef = useRef<TextInput>(null)

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search…'}
        placeholderTextColor="#6B7280"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        {...rest}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            onChangeText('')
            inputRef.current?.focus()
          }}
          style={styles.clearButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Clear search"
        >
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
    height: 46,
  },
  icon: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: { padding: 4 },
  clearIcon: { color: '#6B7280', fontSize: 13 },
})
