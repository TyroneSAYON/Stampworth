import { useState } from 'react';
import { Alert, StyleSheet, View, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

export default function StoreSetupScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to upload a company logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!businessName.trim()) {
      Alert.alert('Required Field', 'Please enter your business name.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required Field', 'Please enter your business address.');
      return;
    }

    // Here you would typically save to backend/state management
    Alert.alert('Success', 'Store setup completed!', [
      {
        text: 'OK',
        onPress: () => {
          // Navigate to loyalty system configuration
          router.replace('/loyaltysystem');
        },
      },
    ]);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: '#2F4366' }]}>Store Setup</Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.icon }]}>
          Complete your company profile to get started
        </Text>

        {/* Company Logo Upload */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Company Logo</Text>
          <TouchableOpacity style={styles.logoUploadContainer} onPress={pickLogo}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoPreview} contentFit="cover" />
            ) : (
              <View style={[styles.logoPlaceholder, { borderColor: theme.icon }]}>
                <Ionicons name="image-outline" size={32} color={theme.icon} />
                <Text style={[styles.logoPlaceholderText, { color: theme.icon }]}>
                  Tap to upload logo
                </Text>
              </View>
            )}
            <View style={[styles.logoEditButton, { backgroundColor: '#2F4366' }]}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Business Name */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Business Name *</Text>
          <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
            <Ionicons name="business-outline" size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              style={[styles.input, { color: theme.text }]}
              placeholder="Enter business name"
              placeholderTextColor={theme.icon}
            />
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Address *</Text>
          <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
            <Ionicons name="location-outline" size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={[styles.input, { color: theme.text }]}
              placeholder="Enter business address"
              placeholderTextColor={theme.icon}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Website URL (Optional) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Website URL (Optional)</Text>
          <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
            <Ionicons name="globe-outline" size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              style={[styles.input, { color: theme.text }]}
              placeholder="https://example.com"
              placeholderTextColor={theme.icon}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#2F4366' }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 12,
  },
  logoUploadContainer: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  logoPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  logoEditButton: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
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

