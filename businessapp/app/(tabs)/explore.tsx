import { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

// Dynamically import expo-location to handle module resolution issues
let Location: typeof import('expo-location') | null = null;
try {
  Location = require('expo-location');
} catch (error) {
  console.warn('expo-location not available:', error);
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  radius: number; // in meters
  active: boolean;
}

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [location, setLocation] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([
    {
      id: '1',
      title: 'Free Coffee',
      description: 'Get a free coffee when you visit our store',
      radius: 100,
      active: true,
    },
  ]);
  const [newPromotion, setNewPromotion] = useState({
    title: '',
    description: '',
    radius: '100',
  });

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (!Location) {
      Alert.alert('Not Available', 'Location services are not available. Please restart the app.');
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationPermission(true);
      getCurrentLocation();
    } else {
      Alert.alert('Permission needed', 'Location permission is required to set up geofencing.');
    }
  };

  const getCurrentLocation = async () => {
    if (!Location) {
      Alert.alert('Not Available', 'Location services are not available.');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handleSaveLocation = () => {
    if (!location) {
      Alert.alert('Error', 'Please enable location services');
      return;
    }
    Alert.alert('Success', 'Store location saved successfully!', [
      {
        text: 'OK',
        onPress: () => {
          // Location saved
        },
      },
    ]);
  };

  const handleCreatePromotion = () => {
    if (!newPromotion.title.trim() || !newPromotion.description.trim()) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }

    const promotion: Promotion = {
      id: Date.now().toString(),
      title: newPromotion.title,
      description: newPromotion.description,
      radius: parseInt(newPromotion.radius) || 100,
      active: true,
    };

    setPromotions([...promotions, promotion]);
    setNewPromotion({ title: '', description: '', radius: '100' });
    Alert.alert('Success', 'Location-based promotion created!');
  };

  const togglePromotion = (id: string) => {
    setPromotions(
      promotions.map((promo) => (promo.id === id ? { ...promo, active: !promo.active } : promo))
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
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
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: '#2F4366' }]}>Explore</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Set store location and create location-based promotions
          </Text>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Store Location</Text>
          {!locationPermission ? (
            <View style={styles.permissionContainer}>
              <Ionicons name="location-outline" size={48} color={theme.icon} />
              <Text style={[styles.permissionText, { color: theme.text }]}>
                Enable location services to save your store location
              </Text>
              <TouchableOpacity
                style={[styles.permissionButton, { backgroundColor: '#2F4366' }]}
                onPress={requestLocationPermission}
              >
                <Text style={styles.permissionButtonText}>Enable Location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.locationContainer}>
              {location ? (
                <>
                  <View style={styles.locationInfo}>
                    <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
                    <View style={styles.locationDetails}>
                      <Text style={[styles.locationText, { color: theme.text }]}>
                        Location saved
                      </Text>
                      <Text style={[styles.coordinatesText, { color: theme.icon }]}>
                        {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.updateButton, { backgroundColor: '#2F4366' }]}
                    onPress={getCurrentLocation}
                  >
                    <Text style={styles.updateButtonText}>Update Location</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: '#2F4366' }]}
                  onPress={handleSaveLocation}
                >
                  <Text style={styles.saveButtonText}>Save Current Location</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Create Promotion */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Create Promotion</Text>
          <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
            <Ionicons name="pricetag-outline" size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={newPromotion.title}
              onChangeText={(text) => setNewPromotion({ ...newPromotion, title: text })}
              style={[styles.input, { color: theme.text }]}
              placeholder="Promotion title (e.g., Free Coffee)"
              placeholderTextColor={theme.icon}
            />
          </View>
          <View style={[styles.inputContainer, styles.textAreaContainer, { borderColor: theme.icon }]}>
            <Ionicons name="document-text-outline" size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={newPromotion.description}
              onChangeText={(text) => setNewPromotion({ ...newPromotion, description: text })}
              style={[styles.input, styles.textArea, { color: theme.text }]}
              placeholder="Description"
              placeholderTextColor={theme.icon}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
            <Ionicons name="radio-button-on-outline" size={20} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={newPromotion.radius}
              onChangeText={(text) => setNewPromotion({ ...newPromotion, radius: text })}
              style={[styles.input, { color: theme.text }]}
              placeholder="Radius (meters)"
              placeholderTextColor={theme.icon}
              keyboardType="number-pad"
            />
          </View>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: '#2F4366' }]}
            onPress={handleCreatePromotion}
          >
            <Text style={styles.createButtonText}>Create Promotion</Text>
          </TouchableOpacity>
        </View>

        {/* Active Promotions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Active Promotions</Text>
          {promotions.map((promo) => (
            <View key={promo.id} style={[styles.promotionCard, { backgroundColor: '#F5F5F5' }]}>
              <View style={styles.promotionHeader}>
                <View style={styles.promotionInfo}>
                  <Text style={[styles.promotionTitle, { color: theme.text }]}>{promo.title}</Text>
                  <Text style={[styles.promotionDescription, { color: theme.icon }]}>
                    {promo.description}
                  </Text>
                  <Text style={[styles.promotionRadius, { color: theme.icon }]}>
                    Radius: {promo.radius}m
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    { backgroundColor: promo.active ? '#27AE60' : '#E0E0E0' },
                  ]}
                  onPress={() => togglePromotion(promo.id)}
                >
                  <Ionicons
                    name={promo.active ? 'checkmark' : 'close'}
                    size={20}
                    color={promo.active ? '#FFFFFF' : theme.icon}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
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
    paddingTop: 0,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 10,
    marginBottom: 0,
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
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F4366',
    marginBottom: 8,
    textAlign: 'left',
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
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
  locationContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  updateButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
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
    marginBottom: 12,
  },
  textAreaContainer: {
    minHeight: 100,
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
    minHeight: 60,
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  promotionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  promotionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  promotionInfo: {
    flex: 1,
  },
  promotionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  promotionDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
  promotionRadius: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
