import { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

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
  const [numberOfStamps, setNumberOfStamps] = useState('10');
  const [reward, setReward] = useState('');
  const [conditions, setConditions] = useState('Buy 10 coffees and get your 11th coffee free.');
  const [collectedStamps, setCollectedStamps] = useState(3); // Show 3 collected stamps in preview

  // Update collected stamps when total changes to keep preview valid
  useEffect(() => {
    const total = parseInt(numberOfStamps) || 10;
    if (collectedStamps > total) {
      setCollectedStamps(Math.max(0, total - 1));
    }
  }, [numberOfStamps]);

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

  const handleSave = () => {
    if (!reward.trim()) {
      Alert.alert('Required Field', 'Please enter a reward for completing the stamp card.');
      return;
    }
    if (!numberOfStamps || parseInt(numberOfStamps) < 1) {
      Alert.alert('Invalid Input', 'Please enter a valid number of stamps (minimum 1).');
      return;
    }

    Alert.alert('Success', 'Loyalty system configured successfully!', [
      {
        text: 'OK',
        onPress: () => {
          router.push('/(tabs)/scan');
        },
      },
    ]);
  };

  const totalStamps = parseInt(numberOfStamps) || 10;
  const stamps = Array.from({ length: totalStamps }, (_, i) => ({
    id: i,
    collected: i < collectedStamps,
  }));

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
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
                <Text style={styles.cardBusinessName}>Your Business</Text>
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
              {stamps.map((stamp, index) => {
                const isLastSlot = index === stamps.length - 1;
                const isRewardSlot = isLastSlot && reward.trim();
                return (
                  <View
                    key={stamp.id}
                    style={[
                      styles.stampPreview,
                      {
                        backgroundColor: stamp.collected || isRewardSlot ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                        borderColor: stamp.collected || isRewardSlot ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                      },
                    ]}
                  >
                    {isRewardSlot ? (
                      <Ionicons name="gift" size={20} color={selectedColor} />
                    ) : stamp.collected ? (
                      <>
                        {customIconUri ? (
                          <Image source={{ uri: customIconUri }} style={styles.customIconPreview} contentFit="contain" />
                        ) : (
                          <Ionicons name={selectedIcon.icon as any} size={20} color={selectedColor} />
                        )}
                      </>
                    ) : null}
                  </View>
                );
              })}
            </View>
            {reward.trim() && (
              <View style={styles.rewardPreview}>
                <Ionicons name="gift" size={16} color="#FFFFFF" />
                <Text style={styles.rewardPreviewText}>{reward}</Text>
              </View>
            )}
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

        {/* Number of Stamps */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Number of Stamps *</Text>
          <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
            <Ionicons name="hash-outline" size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={numberOfStamps}
              onChangeText={setNumberOfStamps}
              style={[styles.input, { color: theme.text }]}
              placeholder="Enter total stamps required"
              placeholderTextColor={theme.icon}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Rewards Configuration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Reward *</Text>
          <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
            <Ionicons name="gift-outline" size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={reward}
              onChangeText={setReward}
              style={[styles.input, { color: theme.text }]}
              placeholder="e.g., Free coffee, 10% discount"
              placeholderTextColor={theme.icon}
            />
          </View>
        </View>

        {/* Conditions & Redemption Rules */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Conditions & Redemption Rules</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer, { borderColor: theme.icon }]}>
            <Ionicons name="document-text-outline" size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={conditions}
              onChangeText={setConditions}
              style={[styles.input, styles.textArea, { color: theme.text }]}
              placeholder="Describe earning and redemption conditions..."
              placeholderTextColor={theme.icon}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#2F4366' }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Configuration</Text>
        </TouchableOpacity>
      </ScrollView>
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
  customIconPreview: {
    width: 24,
    height: 24,
  },
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    gap: 8,
  },
  rewardPreviewText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
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
  // Input Styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  textAreaContainer: {
    minHeight: 120,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    minHeight: 20,
  },
  textArea: {
    minHeight: 80,
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

