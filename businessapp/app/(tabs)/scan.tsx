import { useCallback, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import {
  getCurrentMerchantProfile,
  getMerchantStampRules,
  resolveCustomerById,
  resolveCustomerFromScannedQR,
  logScanEvent,
} from '@/lib/database';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showIdInput, setShowIdInput] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [conditions, setConditions] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        const { data: merchant, error } = await getCurrentMerchantProfile();
        if (cancelled) return;
        if (error || !merchant) {
          if (error?.message === 'AUTH_SESSION_MISSING') { Alert.alert('Session expired', 'Please sign in again.'); router.replace('/signin'); }
          return;
        }
        setMerchantId(merchant.id);
        const { data: rules } = await getMerchantStampRules(merchant.id);
        if (!cancelled && rules?.promotion_text) setConditions(rules.promotion_text);
      };
      load();
      return () => { cancelled = true; };
    }, [])
  );

  const navigateToCard = (resolvedCustomerId: string, src: 'QR' | 'MANUAL', ref?: string) => {
    router.push({
      pathname: '/customercard',
      params: { customerId: resolvedCustomerId, merchantId: merchantId!, source: src, reference: ref || '' },
    });
  };

  const handleBarCode = async ({ data }: BarcodeScanningResult) => {
    setScanned(true); setShowCamera(false);
    const { data: resolved, error } = await resolveCustomerFromScannedQR(data);
    if (error || !resolved?.customer?.id) { Alert.alert('Invalid QR', error?.message || 'Only customerapp QR codes accepted.'); setScanned(false); setShowCamera(true); return; }
    // Log scan event so customer app can react in real-time
    if (merchantId) logScanEvent(merchantId, resolved.customer.id).catch(() => {});
    setScanned(false); setShowCamera(false); setShowIdInput(false);
    navigateToCard(resolved.customer.id, 'QR', data);
  };

  const handleIdSearch = async () => {
    if (!customerId.trim()) { Alert.alert('Required', 'Enter a customer ID.'); return; }
    const { data, error } = await resolveCustomerById(customerId.trim());
    if (error || !data?.id) { Alert.alert('Not found', 'Enter a valid customer ID.'); return; }
    setCustomerId(''); setShowIdInput(false); setShowCamera(false);
    navigateToCard(data.id, 'MANUAL', customerId.trim());
  };

  // Permission states
  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /></View>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color="#C4CAD4" />
          <Text style={styles.permText}>Camera permission is needed to scan QR codes</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/options')}>
          <Ionicons name="storefront" size={18} color="#2F4366" />
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>Scan</Text>
      <Text style={styles.pageSubtitle}>Scan customer QR code to manage stamps</Text>

      {/* Scan Area */}
      <View style={styles.scanArea}>
        {!showCamera && !showIdInput && (
          <TouchableOpacity style={styles.scanTrigger} onPress={() => setShowCamera(true)} disabled={false}>
            <Ionicons name="qr-code-outline" size={52} color="#2F4366" />
            <Text style={styles.scanTriggerText}>Tap to scan</Text>
          </TouchableOpacity>
        )}

        {showCamera && !showIdInput && (
          <View style={styles.cameraBox}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarCode}
            />
            <View style={styles.cameraOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanHint}>Position QR code within frame</Text>
            </View>
          </View>
        )}

        {showIdInput && (
          <View style={styles.idSection}>
            <View style={styles.inputBox}>
              <Ionicons name="id-card-outline" size={18} color="#B0B8C4" />
              <TextInput value={customerId} onChangeText={setCustomerId} style={styles.input} placeholder="Enter customer ID" placeholderTextColor="#C4CAD4" autoCapitalize="none" autoFocus />
            </View>
            <View style={styles.idActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => { setShowIdInput(false); setShowCamera(true); setCustomerId(''); }}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButtonSmall} onPress={handleIdSearch} disabled={false}>
                <Text style={styles.primaryButtonText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Bottom actions */}
      {showCamera && !showIdInput && (
        <TouchableOpacity style={styles.fallbackRow} onPress={() => { setShowCamera(false); setShowIdInput(true); }}>
          <Ionicons name="id-card-outline" size={16} color="#2F4366" />
          <Text style={styles.fallbackText}>Enter ID manually</Text>
        </TouchableOpacity>
      )}

      {/* Conditions */}
      {conditions ? (
        <View style={styles.conditionsCard}>
          <Ionicons name="document-text-outline" size={14} color="#8A94A6" />
          <Text style={styles.conditionsText}>{conditions}</Text>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E4EA' },

  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 20 },
  pageSubtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', paddingHorizontal: 24, marginTop: 4, marginBottom: 20 },
  permText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center' },

  processingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, marginHorizontal: 24, backgroundColor: '#E8F4FD', borderRadius: 10, marginBottom: 12 },
  processingText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#2F4366' },

  // Customer card
  customerCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  customerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center' },
  customerName: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  customerStamps: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 2 },
  customerReward: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#27AE60', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 10, gap: 6 },
  actionText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Poppins-SemiBold' },
  clearButton: { marginTop: 12, alignSelf: 'center' },
  clearText: { color: '#8A94A6', fontSize: 12, fontFamily: 'Poppins-SemiBold' },

  // Scan area
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scanTrigger: { width: 300, height: 300, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E4EA', borderStyle: 'dashed' },
  scanTriggerText: { marginTop: 12, fontSize: 14, color: '#2F4366', fontFamily: 'Poppins-SemiBold' },

  cameraBox: { width: 320, height: 320, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  camera: { flex: 1 },
  cameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 240, height: 240, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 14 },
  scanHint: { position: 'absolute', bottom: 14, color: '#FFFFFF', fontSize: 11, fontFamily: 'Poppins-Regular', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },

  idSection: { width: '100%', maxWidth: 300 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E4EA', borderRadius: 12, paddingHorizontal: 16, height: 54, marginBottom: 14, gap: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },
  idActions: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E4EA' },
  secondaryButtonText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  primaryButtonSmall: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2F4366' },

  fallbackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  fallbackText: { color: '#2F4366', fontSize: 13, fontFamily: 'Poppins-SemiBold' },

  // Conditions
  conditionsCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 24, marginBottom: 100, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14 },
  conditionsText: { flex: 1, fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', lineHeight: 16 },

  primaryButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2F4366' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Poppins-SemiBold' },
});
