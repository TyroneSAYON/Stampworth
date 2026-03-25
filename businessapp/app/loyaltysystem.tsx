import { useState, useEffect } from 'react';
import { Alert, ActivityIndicator, StyleSheet, View, useColorScheme, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import {
  getCurrentMerchantProfile,
  getMerchantLoyaltyConfiguration,
  saveMerchantLoyaltyConfiguration,
} from '@/lib/database';

// Expanded color wheel/palette
const COLOR_SCHEMES = [
  // Primary Colors
  { name: 'Blue', value: '#2F4366' },
  { name: 'Navy', value: '#1A237E' },
  { name: 'Sky Blue', value: '#03A9F4' },
  { name: 'Cyan', value: '#00BCD4' },
  // Green Shades
  { name: 'Green', value: '#27AE60' },
  { name: 'Emerald', value: '#2ECC71' },
  { name: 'Lime', value: '#CDDC39' },
  { name: 'Teal', value: '#1ABC9C' },
  // Purple/Pink Shades
  { name: 'Purple', value: '#9B59B6' },
  { name: 'Violet', value: '#673AB7' },
  { name: 'Pink', value: '#E91E63' },
  { name: 'Rose', value: '#F06292' },
  // Warm Colors
  { name: 'Orange', value: '#E67E22' },
  { name: 'Amber', value: '#FFC107' },
  { name: 'Red', value: '#E74C3C' },
  { name: 'Coral', value: '#FF5722' },
  // Neutral/Dark
  { name: 'Brown', value: '#795548' },
  { name: 'Grey', value: '#607D8B' },
  { name: 'Indigo', value: '#3F51B5' },
  { name: 'Deep Purple', value: '#512DA8' },
];

// Predefined stamp icons
const STAMP_ICONS = [
  { name: 'Coffee Cup', icon: 'cafe' },
  { name: 'Star', icon: 'star' },
  { name: 'Checkmark', icon: 'checkmark-circle' },
  { name: 'Heart', icon: 'heart' },
  { name: 'Trophy', icon: 'trophy' },
  { name: 'Gift', icon: 'gift' },
];

export default function LoyaltySystemScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [selectedColor, setSelectedColor] = useState(COLOR_SCHEMES[0].value);
  const [selectedIcon, setSelectedIcon] = useState(STAMP_ICONS[0]);
  const [customIconUri, setCustomIconUri] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Your Business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);

      const { data: merchant, error: merchantError } = await getCurrentMerchantProfile();
      if (merchantError || !merchant) {
        setLoading(false);
        const errorMessage = merchantError?.message || '';
        if (errorMessage === 'AUTH_SESSION_MISSING') {
          Alert.alert('Session expired', 'Please sign in again.');
          router.replace('/signin');
          return;
        }

        Alert.alert('Merchant account not found', errorMessage || 'Please sign in with your business account.');
        return;
      }

      setBusinessName(merchant.business_name || 'Your Business');

      const { data: existingSettings } = await getMerchantLoyaltyConfiguration();
      if (existingSettings) {
        setSelectedColor(existingSettings.card_color || COLOR_SCHEMES[0].value);

        const matchedIcon = STAMP_ICONS.find((item) => item.icon === existingSettings.stamp_icon_name);
        if (matchedIcon) {
          setSelectedIcon(matchedIcon);
          setCustomIconUri(null);
        } else if (existingSettings.stamp_icon_image_url) {
          setCustomIconUri(existingSettings.stamp_icon_image_url);
          setSelectedIcon({ name: 'Custom', icon: 'image' });
        }
      }

      setLoading(false);
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveMerchantLoyaltyConfiguration({
      cardColor: selectedColor,
      stampIconName: selectedIcon.icon,
      customIconUri,
    });
    setSaving(false);

    if (error) {
      if (error.message === 'AUTH_SESSION_MISSING') {
        Alert.alert('Session expired', 'Please sign in again.');
        router.replace('/signin');
        return;
      }

      Alert.alert('Failed to save loyalty settings', error.message);
      return;
    }

    Alert.alert('Saved', 'Card style configuration has been saved.', [
      {
        text: 'Continue',
        onPress: () => {
          router.push('/stampsetup');
        },
      },
    ]);
  };

  const pickCustomIcon = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to upload a custom icon.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setCustomIconUri(result.assets[0].uri);
      setSelectedIcon({ name: 'Custom', icon: 'image' });
    }
  };

  const totalStamps = 10;
  const collectedStamps = 3;
  const stamps = Array.from({ length: totalStamps }, (_, i) => ({
    id: i,
    collected: i < collectedStamps,
  }));

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading loyalty settings...</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: '#2F4366' }]}>Loyalty System</Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.icon }]}>
          Configure your stamp-based loyalty program
        </Text>

        {/* Stamp Card Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Card Preview</Text>
          <View style={[styles.cardPreview, { backgroundColor: selectedColor }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLogoPlaceholder}>
                <Ionicons name="business" size={24} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.cardBusinessName}>{businessName}</Text>
                <Text style={styles.cardSubtitle}>Loyalty Card</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardFooter}>
              <Text style={styles.cardStampsLabel}>Stamps</Text>
              <Text style={styles.cardStampsValue}>
                {collectedStamps} / {totalStamps}
              </Text>
            </View>
            <View style={styles.stampGrid}>
              {stamps.map((stamp) => (
                <View
                  key={stamp.id}
                  style={[
                    styles.stampPreview,
                    {
                      backgroundColor: stamp.collected ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      borderColor: stamp.collected ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                    },
                  ]}
                >
                  {stamp.collected
                    ? customIconUri
                      ? <Image source={{ uri: customIconUri }} style={styles.stampIconPreview} contentFit="contain" />
                      : <Ionicons name={selectedIcon.icon as any} size={20} color={selectedColor} />
                    : null}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Card Color Scheme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Card Color Scheme</Text>
          <View style={styles.colorGrid}>
            {COLOR_SCHEMES.map((color) => (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorOption,
                  {
                    backgroundColor: color.value,
                    borderWidth: selectedColor === color.value ? 3 : 1,
                    borderColor: selectedColor === color.value ? '#2F4366' : theme.icon,
                  },
                ]}
                onPress={() => setSelectedColor(color.value)}
              >
                {selectedColor === color.value && (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stamp Icon Customization */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Stamp Icon</Text>
          <View style={styles.iconGrid}>
            {STAMP_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon.name}
                style={[
                  styles.iconOption,
                  {
                    borderColor: selectedIcon.name === icon.name && !customIconUri ? '#2F4366' : theme.icon,
                    borderWidth: selectedIcon.name === icon.name && !customIconUri ? 2 : 1,
                    backgroundColor: selectedIcon.name === icon.name && !customIconUri ? 'rgba(47,67,102,0.1)' : 'transparent',
                  },
                ]}
                onPress={() => {
                  setSelectedIcon(icon);
                  setCustomIconUri(null);
                }}
              >
                <Ionicons name={icon.icon as any} size={28} color={selectedColor} />
                <Text style={[styles.iconLabel, { color: theme.text }]}>{icon.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.customIconButton} onPress={pickCustomIcon}>
            <Ionicons name="image-outline" size={24} color="#2F4366" />
            <Text style={[styles.customIconText, { color: '#2F4366' }]}>
              {customIconUri ? 'Change Custom Icon' : 'Upload Custom Icon'}
            </Text>
          </TouchableOpacity>
          {customIconUri && (
            <View style={styles.customIconPreview}>
              <Image source={{ uri: customIconUri }} style={styles.uploadedIcon} contentFit="contain" />
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: '#2F4366' }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Configuration'}</Text>
        </TouchableOpacity>
      </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  header: {
    marginBottom: 8,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
  },
  // Card Preview Styles
  cardPreview: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBusinessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins-Regular',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardStampsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins-Regular',
  },
  cardStampsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  stampGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stampPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampIconPreview: {
    width: 24,
    height: 24,
  },
  // Color Scheme Styles
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Icon Customization Styles
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    justifyContent: 'center',
  },
  iconOption: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
  customIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F4366',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  customIconText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  uploadedIcon: {
    width: 60,
    height: 60,
  },
  customIconPreview: {
    alignItems: 'center',
    marginTop: 8,
  },
  // Save Button
  saveButton: {
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
});

