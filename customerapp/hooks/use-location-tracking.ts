import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { getOrCreateCustomerProfile, updateUserLocation, getAllMerchants } from '@/lib/database';

const TRACKING_INTERVAL_MS = 10000; // update every 10s for live tracking
const MAX_GEOFENCE_RADIUS = 2000; // 2km — only share location if near a store

let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch {}

// Haversine distance in meters
const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function useLocationTracking() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const customerIdRef = useRef<string | null>(null);
  const storesRef = useRef<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    if (!Location) return;

    let cancelled = false;

    const start = async () => {
      const { data: customer } = await getOrCreateCustomerProfile();
      if (cancelled || !customer) return;
      customerIdRef.current = customer.id;

      // Load store locations for proximity check
      const { data: merchants } = await getAllMerchants();
      storesRef.current = (merchants || [])
        .filter((m: any) => m.latitude && m.longitude)
        .map((m: any) => ({ latitude: m.latitude, longitude: m.longitude }));

      const { status } = await Location!.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      saveCurrentLocation();
      intervalRef.current = setInterval(saveCurrentLocation, TRACKING_INTERVAL_MS);
    };

    const saveCurrentLocation = async () => {
      if (!customerIdRef.current || !Location) return;
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        // Privacy: only share location if customer is near a Stampworth store
        const isNearStore = storesRef.current.some((store) =>
          distanceMeters(loc.coords.latitude, loc.coords.longitude, store.latitude, store.longitude) <= MAX_GEOFENCE_RADIUS
        );

        if (isNearStore) {
          await updateUserLocation(
            customerIdRef.current,
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.accuracy ?? 0,
          );
        }
      } catch {}
    };

    start();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
}
