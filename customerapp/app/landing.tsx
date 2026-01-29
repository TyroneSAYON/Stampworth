import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';

export default function LandingScreen() {
  const handlePress = () => {
    router.replace('/signin');
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1}
      onPress={handlePress}
    >
      <ThemedView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        <Image
          source={require('@/assets/images/stampworth-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
});