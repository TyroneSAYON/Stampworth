import { useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { getCurrentUser } from '@/lib/auth';

export default function LoadingScreen() {
  useEffect(() => {
    const bootstrap = async () => {
      const user = await getCurrentUser();
      router.replace(user ? '/(tabs)/qrcode' : '/signin');
    };
    const timeout = setTimeout(bootstrap, 800);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2F4366" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
});
