import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiFetch } from './api'

type CacheEnvelope<T> = {
  data: T
  updatedAt: string
}

export type CachedApiResult<T> = {
  data: T
  fromCache: boolean
  updatedAt: string | null
  error?: string
}

export async function cachedApiFetch<T>(
  cacheKey: string,
  path: string,
  options?: RequestInit,
): Promise<CachedApiResult<T>> {
  try {
    const data = await apiFetch<T>(path, options)
    const envelope: CacheEnvelope<T> = {
      data,
      updatedAt: new Date().toISOString(),
    }
    await AsyncStorage.setItem(storageKey(cacheKey), JSON.stringify(envelope))
    return { data, fromCache: false, updatedAt: envelope.updatedAt }
  } catch (err) {
    const cached = await readCached<T>(cacheKey)
    if (cached) {
      return {
        data: cached.data,
        fromCache: true,
        updatedAt: cached.updatedAt,
        error: err instanceof Error ? err.message : 'Connexion indisponible',
      }
    }
    throw err
  }
}

export async function readCached<T>(cacheKey: string): Promise<CacheEnvelope<T> | null> {
  const raw = await AsyncStorage.getItem(storageKey(cacheKey))
  if (!raw) return null

  try {
    return JSON.parse(raw) as CacheEnvelope<T>
  } catch {
    await AsyncStorage.removeItem(storageKey(cacheKey))
    return null
  }
}

function storageKey(cacheKey: string) {
  return `unigest:offline:${cacheKey}`
}
