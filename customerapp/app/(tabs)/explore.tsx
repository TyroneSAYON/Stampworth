import { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface LocationData {
  id: string;
  name: string;
  address: string;
  services: string[];
  latitude: number;
  longitude: number;
}

// Sample location data - replace with actual API data
const SAMPLE_LOCATIONS: LocationData[] = [
  {
    id: '1',
    name: 'Coffee Corner',
    address: '123 Main Street, Downtown',
    services: ['Coffee', 'Pastries', 'WiFi'],
    latitude: 37.78825,
    longitude: -122.4324,
  },
  {
    id: '2',
    name: 'Bakery Delight',
    address: '456 Oak Avenue, Midtown',
    services: ['Bread', 'Cakes', 'Sandwiches'],
    latitude: 37.78425,
    longitude: -122.4284,
  },
  {
    id: '3',
    name: 'Tech Hub Cafe',
    address: '789 Tech Boulevard, Uptown',
    services: ['Coffee', 'Workspace', 'Charging Stations'],
    latitude: 37.79225,
    longitude: -122.4364,
  },
  {
    id: '4',
    name: 'Green Market',
    address: '321 Park Lane, Central',
    services: ['Organic Food', 'Smoothies', 'Salads'],
    latitude: 37.78025,
    longitude: -122.4244,
  },
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(SAMPLE_LOCATIONS);
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    filterLocations();
  }, [searchQuery]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        setLocationPermission(false);
        setLoading(false);
        Alert.alert(
          'Location Permission',
          'Location permission is required to show nearby merchants. Please enable it in settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(location);
      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setRegion(newRegion);

      // Center map on user location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setLoading(false);
    }
  };

  const filterLocations = () => {
    if (!searchQuery.trim()) {
      setFilteredLocations(SAMPLE_LOCATIONS);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = SAMPLE_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(query) ||
        loc.address.toLowerCase().includes(query) ||
        loc.services.some((service) => service.toLowerCase().includes(query))
    );
    setFilteredLocations(filtered);
  };

  const handleMarkerPress = (location: LocationData) => {
    setSelectedLocation(location);
    setShowModal(true);
  };

  const openGoogleMapsNavigation = (location: LocationData) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${location.latitude},${location.longitude}&dirflg=d`,
      android: `google.navigation:q=${location.latitude},${location.longitude}`,
    });

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to web Google Maps
          const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
          Linking.openURL(webUrl);
        }
      });
    } else {
      // Web fallback
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
      Linking.openURL(webUrl);
    }
  };

  const centerOnUserLocation = () => {
    if (location) {
      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setRegion(newRegion);
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } else {
      getCurrentLocation();
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.searchBar, { borderColor: theme.icon, backgroundColor: '#FFFFFF' }]}>
          <Ionicons name="search" size={20} color={theme.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search locations, services..."
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
        <TouchableOpacity
          style={[styles.locationButton, { backgroundColor: '#2F4366' }]}
          onPress={centerOnUserLocation}
        >
          <Ionicons name="locate" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading map...</Text>
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
          customMapStyle={colorScheme === 'dark' ? darkMapStyle : []}
        >
          {filteredLocations.map((location) => (
            <Marker
              key={location.id}
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={location.name}
              description={location.address}
              onPress={() => handleMarkerPress(location)}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.markerPin, { backgroundColor: '#2F4366' }]}>
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Results Count */}
      {!loading && (
        <View style={[styles.resultsContainer, { backgroundColor: '#FFFFFF' }]}>
          <Text style={[styles.resultsText, { color: theme.text }]}>
            {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* Location Detail Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selectedLocation?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {selectedLocation && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Ionicons name="location-outline" size={20} color={theme.icon} />
                  <Text style={[styles.modalAddress, { color: theme.text }]}>
                    {selectedLocation.address}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Ionicons name="list-outline" size={20} color={theme.icon} />
                  <View style={styles.servicesContainer}>
                    <Text style={[styles.servicesLabel, { color: theme.text }]}>Services:</Text>
                    <View style={styles.servicesList}>
                      {selectedLocation.services.map((service, index) => (
                        <View key={index} style={[styles.serviceTag, { backgroundColor: '#E8F4F8' }]}>
                          <Text style={[styles.serviceText, { color: '#2F4366' }]}>{service}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.navigateButton, { backgroundColor: '#2F4366' }]}
                  onPress={() => {
                    if (selectedLocation) {
                      openGoogleMapsNavigation(selectedLocation);
                      setShowModal(false);
                    }
                  }}
                >
                  <Ionicons name="navigate" size={20} color="#FFFFFF" />
                  <Text style={styles.navigateButtonText}>Navigate with Google Maps</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#746855' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F2',
  },
  resultsText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  modalAddress: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
  },
  servicesContainer: {
    flex: 1,
    marginLeft: 12,
  },
  servicesLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  serviceText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});
