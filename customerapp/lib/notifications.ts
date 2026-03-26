import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

let Notifications: any = null;
let Device: any = null;
try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
} catch {
  // Not available
}

// Configure foreground notification display
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {}
}

export const registerForPushNotifications = async () => {
  try {
    if (!Notifications || !Device || !Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: 4, // HIGH
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2F4366',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
};

export const savePushToken = async (token: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('customers').update({ push_token: token }).eq('auth_id', user.id);
  } catch {}
};

export const setupPushNotifications = async () => {
  try {
    const token = await registerForPushNotifications();
    if (token) await savePushToken(token);
    return token;
  } catch {
    return null;
  }
};

export const addNotificationListeners = (onReceived?: (title: string, body: string) => void) => {
  if (!Notifications) return () => {};

  const sub1 = Notifications.addNotificationReceivedListener((n: any) => {
    const title = n?.request?.content?.title || 'Stampworth';
    const body = n?.request?.content?.body || '';
    if (onReceived) onReceived(title, body);
  });

  const sub2 = Notifications.addNotificationResponseReceivedListener(() => {
    // User tapped notification — app opens
  });

  return () => {
    try { Notifications.removeNotificationSubscription(sub1); } catch {}
    try { Notifications.removeNotificationSubscription(sub2); } catch {}
  };
};
