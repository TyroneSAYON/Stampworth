import { Image } from 'expo-image';
import { StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';

export default function LandingScreen() {
  // Animation values
  const translateY = useRef(new Animated.Value(300)).current; // start below
  const opacity = useRef(new Animated.Value(1)).current;

  // Run entrance animation
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 800,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle tap → fade out → navigate
  const handlePress = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/signin');
    });
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <Image
          source={require('@/assets/images/stampworth-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
});
