import { useState } from 'react';
import { Alert, StyleSheet, View, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showIdInput, setShowIdInput] = useState(false);
  const [customerId, setCustomerId] = useState('');
  
  // Sample conditions & redemption rules - in real app, this would come from state/backend
  const conditions = 'Buy 10 coffees and get your 11th coffee free.';

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    setScanned(true);
    setShowCamera(false);
    // Process the scanned QR code data
    Alert.alert('QR Code Scanned', `Customer ID: ${data}`, [
      {
        text: 'Issue Stamp',
        onPress: () => {
          Alert.alert('Success', 'Stamp issued successfully!');
          setScanned(false);
          setShowCamera(true);
          setShowIdInput(false);
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {
          setScanned(false);
          setShowCamera(true);
        },
      },
    ]);
  };

  const handleIdSearch = () => {
    if (!customerId.trim()) {
      Alert.alert('Required', 'Please enter a customer ID');
      return;
    }
    // Search for customer by ID
    Alert.alert('Customer Found', `Customer ID: ${customerId}`, [
      {
        text: 'Issue Stamp',
        onPress: () => {
          Alert.alert('Success', 'Stamp issued successfully!');
          setCustomerId('');
          setShowIdInput(false);
          setShowCamera(true);
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleQrScanFailed = () => {
    setShowCamera(false);
    setShowIdInput(true);
  };

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/stampworthb-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.brandName}>Stampworth Business</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Requesting camera permission...</Text>
        </View>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/stampworthb-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.brandName}>Stampworth Business</Text>
        </View>
        <View style={styles.content}>
          <Ionicons name="camera-outline" size={64} color={theme.icon} />
          <Text style={[styles.permissionText, { color: theme.text }]}>
            Camera permission is required to scan QR codes
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: '#2F4366' }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header with Logo and Brand Name */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/stampworthb-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.brandName}>Stampworth Business</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/(tabs)/options')}
        >
          <View style={styles.profileLogoContainer}>
            <Ionicons name="storefront" size={20} color="#2F4366" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Scan Customer QR Code</Text>
        </View>

        {/* QR Code Scanner Container */}
        {!showCamera && !showIdInput && (
          <TouchableOpacity
            style={styles.scanButtonContainer}
            onPress={() => setShowCamera(true)}
          >
            <View style={styles.scanButtonBox}>
              <Ionicons name="qr-code-outline" size={64} color="#2F4366" />
              <Text style={styles.scanButtonText}>Tap to scan</Text>
            </View>
          </TouchableOpacity>
        )}

        {showCamera && !showIdInput && (
          <View style={styles.qrCodeContainer}>
            <View style={styles.cameraWrapper}>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              />
              <View style={styles.scannerOverlay}>
                {/* Scanner frame with corner indicators */}
                <View style={styles.scannerFrameContainer}>
                  <View style={styles.scannerFrame}>
                    {/* Corner indicators */}
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                  </View>
                </View>
                {/* Scanning hint */}
                <Text style={styles.scanningHint}>Position QR code within frame</Text>
              </View>
            </View>
          </View>
        )}

        {/* Customer ID Input (Fallback) */}
        {showIdInput && (
          <View style={styles.idContainer}>
            <View style={styles.idInputWrapper}>
              <Ionicons name="id-card-outline" size={24} color={theme.icon} style={styles.idIcon} />
              <TextInput
                value={customerId}
                onChangeText={setCustomerId}
                style={[styles.idInput, { color: theme.text }]}
                placeholder="Enter customer ID"
                placeholderTextColor={theme.icon}
                autoCapitalize="none"
                autoFocus
              />
            </View>
            <View style={styles.idActions}>
              <TouchableOpacity
                style={[styles.backButton, { borderColor: theme.icon }]}
                onPress={() => {
                  setShowIdInput(false);
                  setShowCamera(true);
                  setCustomerId('');
                }}
              >
                <Ionicons name="arrow-back" size={18} color={theme.icon} />
                <Text style={[styles.backButtonText, { color: theme.icon }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchButton, { backgroundColor: '#2F4366' }]}
                onPress={handleIdSearch}
              >
                <Text style={styles.searchButtonText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Fallback Button */}
        {showCamera && !showIdInput && (
          <TouchableOpacity
            style={styles.fallbackButton}
            onPress={handleQrScanFailed}
          >
            <Ionicons name="id-card-outline" size={18} color="#2F4366" />
            <Text style={styles.fallbackButtonText}>Enter ID Manually</Text>
          </TouchableOpacity>
        )}

        {/* Back to Scan Button when showing ID input */}
        {showIdInput && (
          <TouchableOpacity
            style={styles.backToScanButton}
            onPress={() => {
              setShowIdInput(false);
              setShowCamera(false);
              setCustomerId('');
            }}
          >
            <Ionicons name="qr-code-outline" size={18} color="#2F4366" />
            <Text style={styles.backToScanButtonText}>Back to Scan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer with Conditions & Redemption Rules */}
      <View style={styles.footer}>
        <View style={styles.rulesContainer}>
          <View style={styles.rulesHeader}>
            <Ionicons name="document-text-outline" size={16} color="#5F6368" />
            <Text style={styles.rulesTitle}>Conditions & Redemption Rules</Text>
          </View>
          <Text style={styles.rulesText}>{conditions}</Text>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  profileButton: {
    marginLeft: 16,
  },
  profileLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2F4366',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  greetingContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F4366',
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  qrCodeContainer: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    opacity: 0.9,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrameContainer: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  scannerFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#2F4366',
    borderRadius: 8,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#2F4366',
  },
  topLeft: {
    top: -3,
    left: -3,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -3,
    right: -3,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 8,
  },
  scanningHint: {
    position: 'absolute',
    bottom: 20,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: 'center',
  },
  idContainer: {
    width: 240,
    marginBottom: 20,
  },
  idInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 16,
  },
  idIcon: {
    marginRight: 12,
  },
  idInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  idActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  searchButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(47,67,102,0.1)',
  },
  fallbackButtonText: {
    color: '#2F4366',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  scanButtonContainer: {
    width: 280,
    height: 280,
    marginBottom: 20,
  },
  scanButtonBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  scanButtonText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2F4366',
    fontFamily: 'Poppins-SemiBold',
  },
  backToScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(47,67,102,0.1)',
    marginTop: 20,
  },
  backToScanButtonText: {
    color: '#2F4366',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  rulesContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rulesTitle: {
    fontSize: 12,
    color: '#5F6368',
    fontFamily: 'Poppins-SemiBold',
  },
  rulesText: {
    fontSize: 12,
    color: '#5F6368',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});
