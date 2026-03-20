import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentUser } from '@/lib/auth';

export default function LoadingScreen() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const bootstrap = async () => {
      const user = await getCurrentUser();
      if (user) {
        router.replace('/(tabs)/qrcode');
      } else {
        router.replace('/signin');
      }
    };

    const timeout = setTimeout(bootstrap, 1200);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/stampworth-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
});









