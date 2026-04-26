import { Image } from 'expo-image';
import { StyleSheet, Pressable, Animated, Easing, Text, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

const SKIP_AUTH_MODE = process.env.EXPO_PUBLIC_SKIP_AUTH === 'true';

export default function LandingScreen() {
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Check for existing session and auto-navigate if logged in
    (async () => {
      if (SKIP_AUTH_MODE) { setHasSession(true); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Already logged in — go straight to the dashboard
        Animated.timing(screenOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          router.replace('/(tabs)');
        });
      } else {
        setHasSession(false);
      }
    })();
  }, []);

  const handlePress = () => {
    if (hasSession === null) return; // still checking session
    Animated.timing(screenOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      router.replace(SKIP_AUTH_MODE || hasSession ? '/(tabs)' : '/createaccount');
    });
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Animated.View style={[styles.content, { transform: [{ translateY }], opacity: Animated.multiply(opacity, screenOpacity) }]}>
        <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.brand}>Stampworth Business</Text>
      </Animated.View>
      <Animated.View style={[styles.footer, { opacity: Animated.multiply(opacity, screenOpacity) }]}>
        <Text style={styles.tapText}>Tap anywhere to continue</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  logo: { width: 56, height: 56, marginBottom: 20 },
  brand: { fontSize: 28, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: '#8A94A6', fontFamily: 'Poppins-Regular', marginTop: 4 },
  footer: { position: 'absolute', bottom: 60 },
  tapText: { fontSize: 12, color: '#C4CAD4', fontFamily: 'Poppins-Regular' },
});
