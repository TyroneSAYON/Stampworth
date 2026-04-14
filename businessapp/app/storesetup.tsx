import { useState, useCallback } from 'react';
import { Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getCurrentMerchantProfile, saveMerchantStoreSetup } from '@/lib/database';

export default function StoreSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = mode === 'edit';
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        const { data: merchant, error } = await getCurrentMerchantProfile();
        if (cancelled) return;
        if (error || !merchant) {
          setLoading(false);
          if (error?.message === 'AUTH_SESSION_MISSING') { Alert.alert('Session expired', 'Please sign in again.'); router.replace('/signin'); return; }
          Alert.alert('Merchant not found', error?.message || 'Please sign in.');
          return;
        }
        setBusinessName(merchant.business_name || '');
        setEmail(merchant.owner_email || '');
        setPhone((merchant as any).phone_number || '');
        setAddress(merchant.address || '');
        setWebsiteUrl(merchant.website_url || '');
        setLogoUri(merchant.logo_url || null);
        setLoading(false);
      };
      load();
      return () => { cancelled = true; };
    }, [])
  );

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to upload a logo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!result.canceled && result.assets?.[0]?.uri) setLogoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!businessName.trim()) { Alert.alert('Required', 'Enter your business name.'); return; }
    if (!email.trim()) { Alert.alert('Required', 'Enter your email address.'); return; }
    if (!address.trim()) { Alert.alert('Required', 'Enter your business address.'); return; }
    setSaving(true);
    const { error } = await saveMerchantStoreSetup({
      businessName: businessName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      websiteUrl: websiteUrl.trim(),
      logoUri,
    });
    setSaving(false);
    if (error) {
      if (error.message === 'AUTH_SESSION_MISSING') { Alert.alert('Session expired', 'Please sign in again.'); router.replace('/signin'); return; }
      Alert.alert('Failed to save', error.message); return;
    }
    if (isEditMode) {
      Alert.alert('Saved', 'Store setup updated successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      Alert.alert('Success', 'Store setup completed!', [{ text: 'Continue', onPress: () => router.replace('/loyaltysystem') }]);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={styles.loadingText}>Loading store setup...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#2F4366" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Store Setup</Text>
            <Text style={styles.subtitle}>{isEditMode ? 'Update your business details' : 'Complete your business profile'}</Text>
          </View>
        </View>

        {/* Logo */}
        <TouchableOpacity style={styles.logoContainer} onPress={pickLogo}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoPreview} contentFit="cover" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="image-outline" size={28} color="#C4CAD4" />
              <Text style={styles.logoPlaceholderText}>Upload logo</Text>
            </View>
          )}
          <View style={styles.logoEditBadge}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Fields */}
        <Text style={styles.fieldLabel}>BUSINESS NAME</Text>
        <View style={styles.inputBox}>
          <Ionicons name="business-outline" size={18} color="#B0B8C4" />
          <TextInput value={businessName} onChangeText={setBusinessName} style={styles.input} placeholder="Enter business name" placeholderTextColor="#C4CAD4" />
        </View>

        <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
        <View style={styles.inputBox}>
          <Ionicons name="mail-outline" size={18} color="#B0B8C4" />
          <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Enter email address" placeholderTextColor="#C4CAD4" keyboardType="email-address" autoCapitalize="none" />
        </View>

        <Text style={styles.fieldLabel}>PHONE NUMBER (OPTIONAL)</Text>
        <View style={styles.inputBox}>
          <Ionicons name="call-outline" size={18} color="#B0B8C4" />
          <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Enter phone number" placeholderTextColor="#C4CAD4" keyboardType="phone-pad" />
        </View>

        <Text style={styles.fieldLabel}>ADDRESS</Text>
        <View style={[styles.inputBox, { minHeight: 72, alignItems: 'flex-start', paddingVertical: 14 }]}>
          <Ionicons name="location-outline" size={18} color="#B0B8C4" style={{ marginTop: 2 }} />
          <TextInput value={address} onChangeText={setAddress} style={[styles.input, { minHeight: 44 }]} placeholder="Enter business address" placeholderTextColor="#C4CAD4" multiline textAlignVertical="top" />
        </View>

        <Text style={styles.fieldLabel}>WEBSITE (OPTIONAL)</Text>
        <View style={styles.inputBox}>
          <Ionicons name="globe-outline" size={18} color="#B0B8C4" />
          <TextInput value={websiteUrl} onChangeText={setWebsiteUrl} style={styles.input} placeholder="https://example.com" placeholderTextColor="#C4CAD4" autoCapitalize="none" keyboardType="url" />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save & Continue'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 28, paddingTop: 64, paddingBottom: 48 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6' },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 36 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  subtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 2 },

  logoContainer: { width: 100, height: 100, alignSelf: 'center', marginBottom: 36, position: 'relative' },
  logoPreview: { width: 100, height: 100, borderRadius: 20 },
  logoPlaceholder: { width: 100, height: 100, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E0E4EA', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FB' },
  logoPlaceholderText: { marginTop: 6, fontSize: 11, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  logoEditBadge: { position: 'absolute', right: -6, bottom: -6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#2F4366', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

  fieldLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', marginBottom: 8, letterSpacing: 0.5 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E0E4EA', borderRadius: 12, paddingHorizontal: 16, height: 54, marginBottom: 20, gap: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },

  primaryButton: { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2F4366', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', fontFamily: 'Poppins-SemiBold' },
});
