"use client";

const CACHE_PREFIX = 'jarvis-ccache';

interface CacheData<T> {
  timestamp: number;
  data: T;
}

/**
 * Saves data to localStorage with a Time-to-Live (TTL).
 * @param key The cache key.
 * @param data The data to store.
 * @param ttlInMinutes The TTL in minutes. Defaults to 60 minutes.
 */
export function saveToCache<T>(key: string, data: T, ttlInMinutes: number = 60): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheKey = `${CACHE_PREFIX}-${key}`;
    const cacheData: CacheData<T> = {
      timestamp: Date.now(),
      data: data,
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn(`[ccache] Failed to save data for key "${key}":`, error);
  }
}

/**
 * Loads data from localStorage if it exists and is not expired.
 * @param key The cache key.
 * @param ttlInMinutes The TTL in minutes. Defaults to 60 minutes.
 * @returns The cached data or null if not found or expired.
 */
export function loadFromCache<T>(key: string, ttlInMinutes: number = 60): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const cacheKey = `${CACHE_PREFIX}-${key}`;
    const storedData = localStorage.getItem(cacheKey);

    if (!storedData) {
      return null;
    }

    const cacheData: CacheData<T> = JSON.parse(storedData);
    const maxAge = ttlInMinutes * 60 * 1000;

    if (Date.now() - cacheData.timestamp > maxAge) {
      localStorage.removeItem(cacheKey);
      console.log(`[ccache] Cache expired for key "${key}".`);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.warn(`[ccache] Failed to load data for key "${key}":`, error);
    return null;
  }
}

/**
 * Clears a specific cache entry.
 * @param key The cache key to clear.
 */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheKey = `${CACHE_PREFIX}-${key}`;
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn(`[ccache] Failed to clear cache for key "${key}":`, error);
  }
}

/**
 * Clears all cache entries created by this utility.
 */
export function clearAllCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('[ccache] Failed to clear all caches:', error);
  }
}
