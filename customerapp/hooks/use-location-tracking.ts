import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { getOrCreateCustomerProfile, updateUserLocation } from '@/lib/database';

const TRACKING_INTERVAL_MS = 30000; // update every 30s

let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch {}

export function useLocationTracking() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const customerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Location) return;

    let cancelled = false;

    const start = async () => {
      // Get customer profile
      const { data: customer } = await getOrCreateCustomerProfile();
      if (cancelled || !customer) return;
      customerIdRef.current = customer.id;

      // Request location permission
      const { status } = await Location!.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      // Save location immediately
      saveCurrentLocation();

      // Then save periodically
      intervalRef.current = setInterval(saveCurrentLocation, TRACKING_INTERVAL_MS);
    };

    const saveCurrentLocation = async () => {
      if (!customerIdRef.current || !Location) return;
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await updateUserLocation(
          customerIdRef.current,
          loc.coords.latitude,
          loc.coords.longitude,
          loc.coords.accuracy ?? 0,
        );
      } catch {
        // Silently fail — location might not be available
      }
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
