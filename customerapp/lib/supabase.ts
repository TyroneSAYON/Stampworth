import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const memoryStorage = new Map<string, string>();

const safeStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string) => {
    memoryStorage.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // fallback to in-memory
    }
  },
  removeItem: async (key: string) => {
    memoryStorage.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // fallback
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
