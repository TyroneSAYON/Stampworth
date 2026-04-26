import { useState, useCallback } from 'react';
import { Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import {
  getCurrentMerchantProfile,
  getMerchantLoyaltyConfiguration,
  saveMerchantLoyaltyConfiguration,
  saveMerchantStampProgramConfiguration,
} from '@/lib/database';

const COLOR_SCHEMES = [
  { name: 'Blue', value: '#2F4366' },
  { name: 'Navy', value: '#1A237E' },
  { name: 'Sky Blue', value: '#03A9F4' },
  { name: 'Cyan', value: '#00BCD4' },
  { name: 'Green', value: '#27AE60' },
  { name: 'Emerald', value: '#2ECC71' },
  { name: 'Teal', value: '#1ABC9C' },
  { name: 'Purple', value: '#9B59B6' },
  { name: 'Violet', value: '#673AB7' },
  { name: 'Pink', value: '#E91E63' },
  { name: 'Orange', value: '#E67E22' },
  { name: 'Red', value: '#E74C3C' },
  { name: 'Brown', value: '#795548' },
  { name: 'Grey', value: '#607D8B' },
  { name: 'Indigo', value: '#3F51B5' },
  { name: 'Deep Purple', value: '#512DA8' },
];

const STAMP_ICONS = [
  { name: 'Coffee', icon: 'cafe' },
  { name: 'Star', icon: 'star' },
  { name: 'Check', icon: 'checkmark-circle' },
  { name: 'Heart', icon: 'heart' },
  { name: 'Trophy', icon: 'trophy' },
  { name: 'Gift', icon: 'gift' },
  { name: 'Pizza', icon: 'pizza' },
  { name: 'Ice Cream', icon: 'ice-cream' },
];

export default function LoyaltySystemScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = mode === 'edit';
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [selectedColor, setSelectedColor] = useState(COLOR_SCHEMES[0].value);
  const [selectedIcon, setSelectedIcon] = useState(STAMP_ICONS[0]);
  const [customIconUri, setCustomIconUri] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Your Business');

  const [numberOfStamps, setNumberOfStamps] = useState('10');
  const [reward, setReward] = useState('');
  const [conditions, setConditions] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadConfig = async () => {
        setLoading(true);

        const { data: merchant, error: merchantError } = await getCurrentMerchantProfile();
        if (cancelled) return;
        if (merchantError || !merchant) {
          setLoading(false);
          if (merchantError?.message === 'AUTH_SESSION_MISSING') {
            Alert.alert('Session expired', 'Please sign in again.');
            router.replace('/signin');
            return;
          }
          Alert.alert('Merchant account not found', merchantError?.message || 'Please sign in with your business account.');
          return;
        }

        setBusinessName(merchant.business_name || 'Your Business');

        const { data: settings } = await getMerchantLoyaltyConfiguration();
        if (cancelled) return;
        if (settings) {
          setSelectedColor(settings.card_color || COLOR_SCHEMES[0].value);
          setNumberOfStamps(String(settings.stamps_per_redemption || 10));
          setReward(settings.redemption_reward_description || '');
          setConditions(settings.promotion_text || '');

          const matchedIcon = STAMP_ICONS.find((item) => item.icon === settings.stamp_icon_name);
          if (matchedIcon) {
            setSelectedIcon(matchedIcon);
            setCustomIconUri(null);
          } else if (settings.stamp_icon_image_url) {
            setCustomIconUri(settings.stamp_icon_image_url);
            setSelectedIcon({ name: 'Custom', icon: 'image' });
          }
        }

        setLoading(false);
      };

      loadConfig();

      return () => { cancelled = true; };
    }, [])
  );

  const handleSave = async () => {
    if (!numberOfStamps || parseInt(numberOfStamps, 10) < 1) {
      Alert.alert('Invalid Input', 'Please enter a valid number of stamps (minimum 1).');
      return;
    }
    if (!reward.trim()) {
      Alert.alert('Required Field', 'Please enter a reward description.');
      return;
    }

    setSaving(true);

    const { error: styleError } = await saveMerchantLoyaltyConfiguration({
      cardColor: selectedColor,
      stampIconName: selectedIcon.icon,
      customIconUri,
    });

    if (styleError) {
      setSaving(false);
      if (styleError.message === 'AUTH_SESSION_MISSING') {
        Alert.alert('Session expired', 'Please sign in again.');
        router.replace('/signin');
        return;
      }
      Alert.alert('Failed to save card style', styleError.message);
      return;
    }

    const { error: programError } = await saveMerchantStampProgramConfiguration({
      stampsPerRedemption: parseInt(numberOfStamps, 10),
      rewardDescription: reward,
      conditions,
    });

    setSaving(false);

    if (programError) {
      if (programError.message === 'AUTH_SESSION_MISSING') {
        Alert.alert('Session expired', 'Please sign in again.');
        router.replace('/signin');
        return;
      }
      Alert.alert('Failed to save stamp program', programError.message);
      return;
    }

    if (isEditMode) {
      Alert.alert('Saved', 'Loyalty system updated successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      Alert.alert('Saved', 'Loyalty system configuration saved successfully.', [
        { text: 'Go to Scan', onPress: () => router.push('/(tabs)/scan') },
      ]);
    }
  };

  const pickCustomIcon = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to upload a custom icon.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setCustomIconUri(result.assets[0].uri);
      setSelectedIcon({ name: 'Custom', icon: 'image' });
    }
  };

  const stampsNum = parseInt(numberOfStamps, 10) || 10;
  const previewCollected = Math.min(3, stampsNum - 1); // leave last for FREE
  const stamps = Array.from({ length: stampsNum }, (_, i) => ({
    id: i,
    collected: i < previewCollected,
    isFree: i === stampsNum - 1,
  }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading settings...</Text>
        </View>
      ) : (
        <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={80} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#2F4366" />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Loyalty System</Text>
              <Text style={[styles.subtitle, { color: theme.icon }]}>
                Card style, stamps, and rewards
              </Text>
            </View>
          </View>

          {/* Card Preview */}
          <View style={[styles.cardPreview, { backgroundColor: selectedColor }]}>
            <View style={styles.cardRow}>
              <View style={styles.cardLogoPlaceholder}>
                <Ionicons name="business" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardBusinessName} numberOfLines={1}>{businessName}</Text>
                <Text style={styles.cardSubtitle}>Loyalty Card</Text>
              </View>
              <Text style={styles.cardStampsValue}>{previewCollected}/{stampsNum}</Text>
            </View>
            <View style={styles.stampGrid}>
              {stamps.map((stamp) => (
                <View
                  key={stamp.id}
                  style={[
                    styles.stampPreview,
                    stamp.isFree
                      ? { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#FFFFFF', borderWidth: 2 }
                      : {
                          backgroundColor: stamp.collected ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                          borderColor: stamp.collected ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                        },
                  ]}
                >
                  {stamp.isFree
                    ? <Text style={{ fontSize: 8, fontFamily: 'Poppins-SemiBold', color: selectedColor, textAlign: 'center' }}>FREE</Text>
                    : stamp.collected
                      ? customIconUri
                        ? <Image source={{ uri: customIconUri }} style={styles.stampIconPreview} contentFit="contain" />
                        : <Ionicons name={selectedIcon.icon as any} size={18} color={selectedColor} />
                      : null}
                </View>
              ))}
            </View>
          </View>

          {/* Stamp Program */}
          <Text style={styles.sectionTitle}>Stamp Program</Text>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldSmall, styles.inputBox, { borderColor: '#E0E4EA' }]}>
              <Text style={styles.fieldLabel}>Stamps Required</Text>
              <TextInput
                value={numberOfStamps}
                onChangeText={setNumberOfStamps}
                style={styles.fieldInput}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor="#B0B8C4"
              />
            </View>
            <View style={[styles.fieldLarge, styles.inputBox, { borderColor: '#E0E4EA' }]}>
              <Text style={styles.fieldLabel}>Reward</Text>
              <TextInput
                value={reward}
                onChangeText={setReward}
                style={styles.fieldInput}
                placeholder="e.g., Free coffee"
                placeholderTextColor="#B0B8C4"
              />
            </View>
          </View>

          <View style={[styles.inputBox, { borderColor: '#E0E4EA' }]}>
            <Text style={styles.fieldLabel}>Conditions & Redemption Rules</Text>
            <TextInput
              value={conditions}
              onChangeText={setConditions}
              style={[styles.fieldInput, { minHeight: 60 }]}
              placeholder="Describe earning and redemption conditions..."
              placeholderTextColor="#B0B8C4"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Card Color */}
          <Text style={styles.sectionTitle}>Card Color</Text>
          <View style={styles.colorGrid}>
            {COLOR_SCHEMES.map((color) => (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                  selectedColor === color.value && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color.value)}
              >
                {selectedColor === color.value && (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Stamp Icon */}
          <Text style={styles.sectionTitle}>Stamp Icon</Text>
          <View style={styles.iconGrid}>
            {STAMP_ICONS.map((icon) => {
              const isActive = selectedIcon.name === icon.name && !customIconUri;
              return (
                <TouchableOpacity
                  key={icon.name}
                  style={[
                    styles.iconOption,
                    isActive && styles.iconOptionActive,
                  ]}
                  onPress={() => { setSelectedIcon(icon); setCustomIconUri(null); }}
                >
                  <Ionicons name={icon.icon as any} size={26} color={isActive ? '#2F4366' : '#8A94A6'} />
                  <Text style={[styles.iconLabel, isActive && { color: '#2F4366' }]}>{icon.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.customIconButton} onPress={pickCustomIcon}>
            <Ionicons name="image-outline" size={20} color="#2F4366" />
            <Text style={styles.customIconText}>
              {customIconUri ? 'Change Custom Icon' : 'Upload Custom Icon'}
            </Text>
          </TouchableOpacity>
          {customIconUri && (
            <View style={styles.customIconPreview}>
              <Image source={{ uri: customIconUri }} style={styles.uploadedIcon} contentFit="contain" />
            </View>
          )}

          {/* Save */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Configuration'}</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      )}
    </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Poppins-Regular' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  subtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', marginTop: 2 },

  // Card Preview
  cardPreview: { borderRadius: 16, padding: 18, marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  cardLogoPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  cardBusinessName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
  cardSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins-Regular' },
  cardStampsValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stampPreview: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stampIconPreview: { width: 20, height: 20 },

  // Sections
  sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#2F4366', marginBottom: 14, marginTop: 4 },

  // Stamp program fields
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fieldSmall: { flex: 1 },
  fieldLarge: { flex: 2 },
  inputBox: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F8F9FB', marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1A1A2E', minHeight: 22, padding: 0 },

  // Colors
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  colorOption: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorOptionSelected: { borderColor: '#1A1A2E', borderWidth: 3 },

  // Icons
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  iconOption: { width: 72, height: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
  iconOptionActive: { backgroundColor: 'rgba(47,67,102,0.1)', borderWidth: 2, borderColor: '#2F4366' },
  iconLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', marginTop: 4, color: '#8A94A6' },

  customIconButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2F4366', borderStyle: 'dashed', marginBottom: 12 },
  customIconText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#2F4366' },
  uploadedIcon: { width: 52, height: 52 },
  customIconPreview: { alignItems: 'center', marginBottom: 12 },

  // Save
  saveButton: { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2F4366', marginTop: 8 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', fontFamily: 'Poppins-SemiBold' },
});
