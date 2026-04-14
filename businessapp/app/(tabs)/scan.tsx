import { useCallback, useState } from 'react';
import { Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
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
  const [searching, setSearching] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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
        setBusinessName(merchant.business_name || '');
        setLogoUrl(merchant.logo_url || null);
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
    const query = customerId.trim();
    if (!query) { Alert.alert('Required', 'Enter a customer ID, username, or email.'); return; }
    setSearching(true);
    const { data, error } = await resolveCustomerById(query);
    setSearching(false);
    if (error || !data?.id) {
      Alert.alert('Not found', error?.message || 'No customer matches that input.');
      return;
    }
    if (merchantId) logScanEvent(merchantId, data.id).catch(() => {});
    setCustomerId(''); setShowIdInput(false); setShowCamera(false);
    navigateToCard(data.id, 'MANUAL', query);
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
          <Text style={styles.brandName}>Stampworth Business</Text>
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ThemedView style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth Business</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/options')}>
          <Ionicons name="storefront" size={18} color="#2F4366" />
        </TouchableOpacity>
      </View>

      <View style={styles.scrollContent}>
        <Text style={styles.pageTitle}>Scan</Text>
        <Text style={styles.pageSubtitle}>Scan customer QR or search by ID</Text>

        {/* Business identity */}
        {businessName ? (
          <View style={styles.businessCard}>
            <View style={styles.businessLogoWrap}>
              {logoUrl
                ? <Image source={{ uri: logoUrl }} style={styles.businessLogo} contentFit="cover" />
                : <Ionicons name="storefront" size={20} color="#2F4366" />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.businessLabel}>Scanning as</Text>
              <Text style={styles.businessName} numberOfLines={1}>{businessName}</Text>
            </View>
          </View>
        ) : null}

        {/* Default state — choices */}
        {!showCamera && !showIdInput && (
          <>
            <TouchableOpacity style={styles.scanTrigger} activeOpacity={0.85} onPress={() => setShowCamera(true)}>
              <Ionicons name="qr-code-outline" size={48} color="#FFFFFF" />
              <Text style={styles.scanTriggerTitle}>Scan Customer Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.searchLink} onPress={() => setShowIdInput(true)}>
              <Ionicons name="search" size={18} color="#2F4366" />
              <Text style={styles.searchLinkText}>Search Customer</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Camera */}
        {showCamera && !showIdInput && (
          <>
            <View style={styles.cameraBox}>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCode}
              />
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.cameraHintInside}>Position the QR code within the frame</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCamera(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Search by ID */}
        {showIdInput && (
          <View style={styles.idCard}>
            <Text style={styles.idLabel}>Customer Lookup</Text>
            <View style={styles.inputBox}>
              <Ionicons name="search" size={18} color="#B0B8C4" />
              <TextInput
                value={customerId}
                onChangeText={setCustomerId}
                style={styles.input}
                placeholder="ID, @username, or email"
                placeholderTextColor="#C4CAD4"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                onSubmitEditing={handleIdSearch}
                returnKeyType="search"
              />
            </View>
            <View style={styles.idActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => { setShowIdInput(false); setCustomerId(''); }}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButtonSmall, searching && { opacity: 0.6 }]} onPress={handleIdSearch} disabled={searching}>
                {searching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Search</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Conditions */}
        {conditions && !showCamera && !showIdInput ? (
          <View style={styles.conditionsCard}>
            <Ionicons name="document-text-outline" size={14} color="#8A94A6" />
            <Text style={styles.conditionsText} numberOfLines={2}>{conditions}</Text>
          </View>
        ) : null}
      </View>
    </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 52, paddingBottom: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E4EA' },

  scrollContent: { flex: 1, paddingBottom: 12 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 8, marginBottom: 12 },
  pageSubtitle: { display: 'none' as any },

  // Business identity card — compact
  businessCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 24, backgroundColor: 'transparent', padding: 0, marginBottom: 14 },
  businessLogoWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  businessLogo: { width: 42, height: 42, borderRadius: 21 },
  businessLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5 },
  businessName: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#2F4366', marginTop: 1 },
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

  // Primary scan card — fills almost all space
  scanTrigger: { flex: 1, marginHorizontal: 24, backgroundColor: '#2F4366', borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 18, paddingHorizontal: 24, gap: 12 },
  scanTriggerTitle: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },

  // Search link (centered text below card)
  searchLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginBottom: 8 },
  searchLinkText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },

  // Camera — same height as scan card (flex: 1)
  cameraBox: { flex: 1, marginHorizontal: 24, marginBottom: 18, borderRadius: 28, overflow: 'hidden', position: 'relative', backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 240, height: 240, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 14 },
  cameraHintInside: { position: 'absolute', bottom: 24, color: '#FFFFFF', fontSize: 12, fontFamily: 'Poppins-Regular', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  cancelBtn: { alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10, marginBottom: 8 },
  cancelBtnText: { color: '#8A94A6', fontSize: 13, fontFamily: 'Poppins-SemiBold' },

  // Search by ID card
  idCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E0E4EA' },
  idLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F8FB', borderWidth: 1, borderColor: '#E0E4EA', borderRadius: 12, paddingHorizontal: 14, height: 50, marginBottom: 14, gap: 10 },
  input: { flex: 1, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },
  idActions: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E4EA' },
  secondaryButtonText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  primaryButtonSmall: { flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2F4366', flexDirection: 'row', gap: 6 },

  // Conditions
  conditionsCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 24, marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0E4EA' },
  conditionsText: { flex: 1, fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', lineHeight: 16 },

  primaryButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2F4366' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Poppins-SemiBold' },
});
