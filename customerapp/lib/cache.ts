import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'sw_cache_';

export const setCache = async (key: string, data: any, ttlMs: number = 5 * 60 * 1000) => {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, expiresAt: Date.now() + ttlMs }));
  } catch {}
};

export const getCache = async <T = any>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    // Return cached data even if expired (stale-while-revalidate)
    return data as T;
  } catch { return null; }
};

export const getCacheFresh = async <T = any>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) return null; // expired
    return data as T;
  } catch { return null; }
};

export const clearCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
  } catch {}
};
