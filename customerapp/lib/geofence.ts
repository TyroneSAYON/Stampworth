import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

let Location: typeof import('expo-location') | null = null;
let TaskManager: typeof import('expo-task-manager') | null = null;
let Notifications: typeof import('expo-notifications') | null = null;
try { Location = require('expo-location'); } catch {}
try { TaskManager = require('expo-task-manager'); } catch {}
try { Notifications = require('expo-notifications'); } catch {}

const GEOFENCE_TASK = 'STAMPWORTH_GEOFENCE_TASK';
const NOTIFIED_KEY_PREFIX = 'geofence_notified_';
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours — don't re-notify for same store

// In-memory cooldown tracker (resets on app restart, which is fine)
const notifiedMap = new Map<string, number>();

type StoreLoc = {
  id: string;
  business_name: string;
  latitude: number;
  longitude: number;
  logo_url?: string | null;
};

// Haversine distance in meters
const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Default radius in meters — user can change this
let geofenceRadius = 500;

export const setGeofenceRadius = (meters: number) => {
  geofenceRadius = Math.max(10, Math.min(5000, meters));
};

export const getGeofenceRadius = () => geofenceRadius;

// Send a local notification for a nearby store
const sendNearbyNotification = async (store: StoreLoc, distMeters: number) => {
  if (!Notifications) return;

  const distLabel = distMeters < 1000
    ? `${Math.round(distMeters)}m`
    : `${(distMeters / 1000).toFixed(1)}km`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏪 Stampworth store nearby!',
      body: `${store.business_name} is ${distLabel} away. Earn stamps on your visit!`,
      data: { merchantId: store.id, type: 'geofence' },
      sound: 'default',
    },
    trigger: null, // send immediately
  });
};

// Check current location against all Stampworth stores
export const checkNearbyStores = async (latitude: number, longitude: number) => {
  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, business_name, latitude, longitude, logo_url')
    .eq('is_active', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (!merchants || merchants.length === 0) return;

  const now = Date.now();

  for (const m of merchants) {
    if (!m.latitude || !m.longitude) continue;

    const dist = getDistanceMeters(latitude, longitude, m.latitude, m.longitude);

    if (dist <= geofenceRadius) {
      // Check cooldown
      const lastNotified = notifiedMap.get(m.id) || 0;
      if (now - lastNotified < COOLDOWN_MS) continue;

      notifiedMap.set(m.id, now);
      await sendNearbyNotification(m as StoreLoc, dist);
    }
  }
};

// Start background geofence monitoring
export const startGeofenceMonitoring = async () => {
  if (!Location || !TaskManager) return false;

  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;

  // Request background permission (needed for background location)
  if (Platform.OS !== 'web') {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      // Fall back to foreground-only monitoring
      startForegroundGeofence();
      return true;
    }
  }

  // Define the background task
  if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) {
    TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
      if (error || !data?.locations?.length) return;
      const { latitude, longitude } = data.locations[0].coords;
      await checkNearbyStores(latitude, longitude);
    });
  }

  // Check if already running
  const isRunning = await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK).catch(() => false);
  if (isRunning) return true;

  await Location.startLocationUpdatesAsync(GEOFENCE_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 200, // update every 200m moved
    timeInterval: 60000, // or every 60 seconds
    deferredUpdatesInterval: 60000,
    showsBackgroundLocationIndicator: false,
    foregroundService: Platform.OS === 'android' ? {
      notificationTitle: 'Stampworth',
      notificationBody: 'Finding nearby stores for you',
      notificationColor: '#2F4366',
    } : undefined,
  });

  return true;
};

// Foreground-only fallback using interval
let foregroundInterval: ReturnType<typeof setInterval> | null = null;

const startForegroundGeofence = () => {
  if (foregroundInterval || !Location) return;

  foregroundInterval = setInterval(async () => {
    try {
      const loc = await Location!.getCurrentPositionAsync({ accuracy: Location!.Accuracy.Balanced });
      await checkNearbyStores(loc.coords.latitude, loc.coords.longitude);
    } catch {}
  }, 60000); // check every 60 seconds
};

export const stopGeofenceMonitoring = async () => {
  if (foregroundInterval) {
    clearInterval(foregroundInterval);
    foregroundInterval = null;
  }

  if (!Location || !TaskManager) return;

  const isRunning = await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK).catch(() => false);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(GEOFENCE_TASK);
  }
};
