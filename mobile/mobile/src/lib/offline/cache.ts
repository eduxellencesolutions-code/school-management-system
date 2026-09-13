import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'offline_cache:'

export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify({ data, cachedAt: new Date().toISOString() }))
  } catch {
    // Caching is best-effort — never let a cache-write failure break the real request
  }
}

export async function readCache<T>(key: string): Promise<{ data: T; cachedAt: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${key}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Wraps a network loader: tries the network first, caches success, falls back
// to the last cached value (with its age) if the network call fails.
export async function loadWithCacheFallback<T>(
  key: string,
  loader: () => Promise<T>
): Promise<{ data: T; fromCache: boolean; cachedAt?: string }> {
  try {
    const data = await loader()
    writeCache(key, data) // fire-and-forget
    return { data, fromCache: false }
  } catch (networkError) {
    const cached = await readCache<T>(key)
    if (cached) {
      return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt }
    }
    throw networkError // no cache available — surface the real error as before
  }
}