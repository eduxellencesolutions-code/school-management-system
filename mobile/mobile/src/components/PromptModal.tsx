import { useState } from 'react'
import { Modal, View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'

interface PromptModalProps {
  visible: boolean
  title: string
  message?: string
  placeholder?: string
  confirmLabel?: string
  destructive?: boolean
  onCancel: () => void
  onConfirm: (value: string) => void
}

export function PromptModal({
  visible, title, message, placeholder, confirmLabel = 'Confirm',
  destructive = false, onCancel, onConfirm,
}: PromptModalProps) {
  const [value, setValue] = useState('')

  function handleConfirm() {
    const trimmed = value.trim()
    if (!trimmed) return
    onConfirm(trimmed)
    setValue('')
  }

  function handleCancel() {
    setValue('')
    onCancel()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}

          <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={value}
            onChangeText={setValue}
            autoFocus
            multiline
          />

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, destructive && styles.confirmButtonDestructive, !value.trim() && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!value.trim()}
            >
              <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  message: { fontSize: 13, color: '#666', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14,
    minHeight: 44, textAlignVertical: 'top', marginBottom: 16,
  },
  buttonRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancelButtonText: { fontSize: 14, color: '#666', fontWeight: '500' },
  confirmButton: { backgroundColor: '#1a56db', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  confirmButtonDestructive: { backgroundColor: '#d92d20' },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})