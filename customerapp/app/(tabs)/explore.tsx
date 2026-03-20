import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { findNearbyStores, getMerchantById } from '@/lib/database';

type NearbyMerchant = {
  merchant_id: string;
  business_name: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  geofence_radius_meters: number;
};

type MerchantDetail = {
  id: string;
  business_name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
};

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allMerchants, setAllMerchants] = useState<NearbyMerchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<NearbyMerchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantDetail | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.08,
    longitudeDelta: 0.04,
  });

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMerchants(allMerchants);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredMerchants(
      allMerchants.filter((merchant) => merchant.business_name.toLowerCase().includes(query)),
    );
  }, [searchQuery, allMerchants]);

  const refreshNearbyMerchants = useCallback(async () => {
    try {
      setLoading(true);
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      const nextRegion: Region = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.04,
      };

      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 800);

      const { data, error } = await findNearbyStores(currentLocation.coords.latitude, currentLocation.coords.longitude, 10000);

      if (error) {
        setLoading(false);
        Alert.alert('Store lookup failed', error.message);
        return;
      }

      const mapped = ((data || []) as NearbyMerchant[]).filter(
        (item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
      );

      setAllMerchants(mapped);
      setFilteredMerchants(mapped);
      setLoading(false);
    } catch {
      setLoading(false);
      Alert.alert('Map error', 'Unable to load nearby stores right now.');
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission(false);
        setLoading(false);
        Alert.alert('Location permission required', 'Please allow location access to view nearby stores.');
        return;
      }

      setLocationPermission(true);
      await refreshNearbyMerchants();
    } catch {
      setLoading(false);
      Alert.alert('Location error', 'Could not read your location.');
    }
  }, [refreshNearbyMerchants]);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  const openMerchantDetail = async (merchant: NearbyMerchant) => {
    const { data } = await getMerchantById(merchant.merchant_id);

    setSelectedMerchant(
      data || {
        id: merchant.merchant_id,
        business_name: merchant.business_name,
        latitude: merchant.latitude,
        longitude: merchant.longitude,
      },
    );
    setShowModal(true);
  };

  const navigateToMerchant = (merchant: MerchantDetail) => {
    const destination = `${merchant.latitude},${merchant.longitude}`;

    const appUrl = Platform.select({
      ios: `maps://app?daddr=${destination}&dirflg=d`,
      android: `google.navigation:q=${destination}`,
      default: '',
    });

    if (appUrl) {
      Linking.canOpenURL(appUrl).then((supported) => {
        if (supported) {
          Linking.openURL(appUrl);
        } else {
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
        }
      });
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.background }]}> 
        <View style={[styles.searchBar, { borderColor: theme.icon, backgroundColor: '#FFFFFF' }]}> 
          <Ionicons name="search" size={20} color={theme.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search store name..."
            placeholderTextColor={theme.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.icon} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.locationButton} onPress={refreshNearbyMerchants}>
          <Ionicons name="locate" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Finding nearby stores...</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={locationPermission}
          showsMyLocationButton={false}
        >
          {filteredMerchants.map((merchant) => (
            <Marker
              key={merchant.merchant_id}
              coordinate={{ latitude: merchant.latitude, longitude: merchant.longitude }}
              title={merchant.business_name}
              description={`${Math.round(merchant.distance_meters)}m away`}
              onPress={() => openMerchantDetail(merchant)}
            >
              <View style={styles.markerPin}>
                <Ionicons name="storefront" size={16} color="#FFFFFF" />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {!loading && (
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsText, { color: theme.text }]}> 
            {filteredMerchants.length} Stampworth Business App store{filteredMerchants.length === 1 ? '' : 's'} nearby
          </Text>
        </View>
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}> 
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedMerchant?.business_name}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {selectedMerchant && (
              <ScrollView>
                <View style={styles.modalSection}>
                  <Ionicons name="location-outline" size={20} color={theme.icon} />
                  <Text style={[styles.modalAddress, { color: theme.text }]}> 
                    {[selectedMerchant.address, selectedMerchant.city, selectedMerchant.state, selectedMerchant.postal_code, selectedMerchant.country]
                      .filter(Boolean)
                      .join(', ') || 'Address unavailable'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => {
                    navigateToMerchant(selectedMerchant);
                    setShowModal(false);
                  }}
                >
                  <Ionicons name="navigate" size={20} color="#FFFFFF" />
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    gap: 10,
    zIndex: 2,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2F4366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  map: { flex: 1 },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2F4366',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsText: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    minHeight: 210,
    maxHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
    marginRight: 12,
  },
  modalSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
  },
  modalAddress: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2F4366',
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
});
