import { Image } from 'expo-image';
import { StyleSheet, View, useColorScheme, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo entrance animation
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    logoScale.value = withSequence(
      withTiming(1.2, { duration: 600, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) })
    );

    // Subtle floating animation
    logoRotation.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Text fade in after logo
    setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    }, 500);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [
        { scale: logoScale.value },
        { rotate: `${logoRotation.value}deg` },
      ],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  const backgroundColors = colorScheme === 'dark' 
    ? { light: '#1D3D47', dark: '#0A1A1F' }
    : { light: '#E8F4F8', dark: '#A1CEDC' };

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={[styles.backgroundGradient, { backgroundColor: backgroundColors.light }]} />
      
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require('@/assets/images/stampworth-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.textContainer, textAnimatedStyle]} entering={FadeInUp.delay(800).duration(600)}>
        <Text style={[styles.brandText, { color: Colors[colorScheme ?? 'light'].text }]}>
          Stampworth
        </Text>
        <Text style={[styles.subtitle, { color: Colors[colorScheme ?? 'light'].text }]}>
          your virtual loyalty card
        </Text>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  brandText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 40,
    fontFamily: 'Poppins-Regular',
  },
});
