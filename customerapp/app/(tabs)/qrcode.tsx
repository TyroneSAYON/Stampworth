import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedView } from '@/components/themed-view';

export default function QRCodeScreen() {
  return (
    <ThemedView style={styles.container}>
      {/* Header with Logo and Brand Name */}
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/stampworth-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.brandName}>Stampworth</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Greeting */}
        <Text style={styles.greeting}>Hi Andrei! 👋</Text>

        {/* QR Code Container */}
        <View style={styles.qrCodeContainer}>
          <View style={styles.qrPlaceholder}>
            {/* Empty container for QR code - replace with actual QR code */}
          </View>
        </View>

        {/* QR Code ID */}
        <Text style={styles.qrCodeId}>2001-0017</Text>
      </View>

      {/* Footer Text */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Show this QR Code to the counter</Text>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 10,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2F4366',
    letterSpacing: 0.5,
    fontFamily: 'Poppins-SemiBold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F4366',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  qrCodeContainer: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    // This is the empty container where QR code will be rendered
    // You can replace this with an actual QR code component
  },
  qrCodeId: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5F6368',
    marginTop: 10,
    letterSpacing: 1,
    fontFamily: 'Poppins-Regular',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding to account for tab bar
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#5F6368',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
});