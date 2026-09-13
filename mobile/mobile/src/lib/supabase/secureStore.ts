import 'react-native-get-random-values'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as aesjs from 'aes-js'

class LargeSecureStore {
  private async getKey(keyName: string): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(keyName)
    if (existing) return aesjs.utils.hex.toBytes(existing)

    const newKey = crypto.getRandomValues(new Uint8Array(32))
    await SecureStore.setItemAsync(keyName, aesjs.utils.hex.fromBytes(newKey))
    return newKey
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key)
    if (!encrypted) return null

    const keyName = `${key}_enc_key`
    const encryptionKey = await this.getKey(keyName)
    const encryptedBytes = aesjs.utils.hex.toBytes(encrypted)
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1))
    const decryptedBytes = cipher.decrypt(encryptedBytes)
    return aesjs.utils.utf8.fromBytes(decryptedBytes)
  }

  async setItem(key: string, value: string): Promise<void> {
    const keyName = `${key}_enc_key`
    const encryptionKey = await this.getKey(keyName)
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1))
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value))
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes))
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
    await SecureStore.deleteItemAsync(`${key}_enc_key`)
  }
}

export const largeSecureStore = new LargeSecureStore()