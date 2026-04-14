import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getAllMerchants } from '@/lib/database';

const NEARBY_THRESHOLD = 2000; // 2000m

let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch {}

let MapView: any = null;
let MarkerComp: any = null;
let PROVIDER_GOOGLE: any = null;
if (Platform.OS !== 'web') {
  try {
    const M = require('react-native-maps');
    MapView = M.default;
    MarkerComp = M.Marker;
    PROVIDER_GOOGLE = M.PROVIDER_GOOGLE;
  } catch {}
}

type Merchant = {
  id: string;
  business_name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  phone_number?: string | null;
};

export default function ExploreScreen() {
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [nearbyAlert, setNearbyAlert] = useState<Merchant | null>(null);
  const dismissedNearbyRef = useRef<Set<string>>(new Set());
  const nearbySlideAnim = useRef(new Animated.Value(-150)).current;

  useFocusEffect(
    useCallback(() => {
      if (!loaded) loadData();
    }, [loaded])
  );

  const loadData = async () => {
    setLoading(true);

    // Run location + merchants in parallel
    const [locationResult, merchantsResult] = await Promise.all([
      Location ? Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
        if (status === 'granted') return Location!.getCurrentPositionAsync({});
        return null;
      }).catch(() => null) : Promise.resolve(null),
      getAllMerchants(),
    ]);

    if (locationResult?.coords) {
      setUserLocation({ latitude: locationResult.coords.latitude, longitude: locationResult.coords.longitude });
    }
    const allMerchants = merchantsResult.data || [];
    setMerchants(allMerchants);
    setLoading(false);
    setLoaded(true);

    // Check for nearby stores
    if (locationResult?.coords) {
      const loc = locationResult.coords;
      for (const m of allMerchants) {
        if (!m.latitude || !m.longitude || dismissedNearbyRef.current.has(m.id)) continue;
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(m.latitude - loc.latitude);
        const dLon = toRad(m.longitude - loc.longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(loc.latitude)) * Math.cos(toRad(m.latitude)) * Math.sin(dLon / 2) ** 2;
        const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        if (dist <= NEARBY_THRESHOLD) {
          setNearbyAlert(m);
          break;
        }
      }
    }
  };

  const getDistance = (m: Merchant) => {
    if (!userLocation || !m.latitude || !m.longitude) return null;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(m.latitude - userLocation.latitude);
    const dLon = toRad(m.longitude - userLocation.longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userLocation.latitude)) * Math.cos(toRad(m.latitude)) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const formatDist = (d: number | null) => {
    if (d === null) return '';
    return d < 1000 ? `${d}m` : `${(d / 1000).toFixed(1)}km`;
  };

  const formatAddress = (m: Merchant) => [m.address, m.city, m.state, m.country].filter(Boolean).join(', ') || 'No address set';

  const navigateTo = (m: Merchant) => {
    if (!m.latitude || !m.longitude) { Alert.alert('No location', 'This store has not set their location yet.'); return; }
    const dest = `${m.latitude},${m.longitude}`;
    const url = Platform.select({ ios: `maps://app?daddr=${dest}&dirflg=d`, android: `google.navigation:q=${dest}`, default: '' });
    if (url) Linking.canOpenURL(url).then((ok) => Linking.openURL(ok ? url : `https://www.google.com/maps/dir/?api=1&destination=${dest}`));
  };

  // Animate nearby alert
  useEffect(() => {
    if (nearbyAlert) {
      Animated.spring(nearbySlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    } else {
      Animated.timing(nearbySlideAnim, { toValue: -150, duration: 200, useNativeDriver: true }).start();
    }
  }, [nearbyAlert]);

  const dismissNearbyAlert = () => {
    if (nearbyAlert) dismissedNearbyRef.current.add(nearbyAlert.id);
    setNearbyAlert(null);
  };

  const filtered = searchQuery.trim()
    ? merchants.filter((m) =>
        m.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.city || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : merchants;

  const sorted = [...filtered].sort((a, b) => {
    const dA = getDistance(a);
    const dB = getDistance(b);
    if (dA === null && dB === null) return 0;
    if (dA === null) return 1;
    if (dB === null) return -1;
    return dA - dB;
  });

  const merchantsOnMap = sorted.filter((m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude));
  const hasMap = !!MapView;

  const mapRegion = userLocation
    ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : merchantsOnMap.length > 0
      ? { latitude: merchantsOnMap[0].latitude!, longitude: merchantsOnMap[0].longitude!, latitudeDelta: 0.05, longitudeDelta: 0.05 }
      : { latitude: 14.5995, longitude: 120.9842, latitudeDelta: 0.08, longitudeDelta: 0.04 };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/stampworth-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth</Text>
        </View>
      </View>

      <Text style={styles.pageTitle}>Explore</Text>
      <Text style={styles.pageSubtitle}>Discover Stampworth partner stores</Text>

      {/* Nearby store alert */}
      {nearbyAlert && (
        <Animated.View style={[styles.nearbyBanner, { transform: [{ translateY: nearbySlideAnim }] }]}>
          <TouchableOpacity style={styles.nearbyBannerInner} activeOpacity={0.85} onPress={() => { setSelectedMerchant(nearbyAlert); setModalVisible(true); dismissNearbyAlert(); }}>
            <View style={styles.nearbyBannerIcon}>
              {nearbyAlert.logo_url ? (
                <Image source={{ uri: nearbyAlert.logo_url }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
              ) : (
                <Ionicons name="storefront" size={18} color="#FFFFFF" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nearbyBannerTitle}>Stampworth store nearby!</Text>
              <Text style={styles.nearbyBannerText}>{nearbyAlert.business_name} is within {formatDist(getDistance(nearbyAlert))} from you</Text>
            </View>
            <TouchableOpacity onPress={dismissNearbyAlert} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#B0B8C4" />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} style={styles.searchInput} placeholder="Search by name, city..." placeholderTextColor="#C4CAD4" />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#C4CAD4" /></TouchableOpacity>}
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Ionicons name="locate" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /><Text style={styles.loadingText}>Loading stores...</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Map or Location card */}
          {hasMap ? (
            <View style={styles.mapContainer}>
              <MapView style={styles.map} initialRegion={mapRegion} showsUserLocation={!!userLocation} showsMyLocationButton={false}>
                {merchantsOnMap.map((m) => (
                  <MarkerComp key={m.id} coordinate={{ latitude: m.latitude!, longitude: m.longitude! }} title={m.business_name} description={formatDist(getDistance(m)) || formatAddress(m)} onPress={() => { setSelectedMerchant(m); setModalVisible(true); }}>
                    <View style={styles.markerPin}>
                      {m.logo_url ? (
                        <Image source={{ uri: m.logo_url }} style={styles.markerLogo} contentFit="cover" />
                      ) : (
                        <Ionicons name="storefront" size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </MarkerComp>
                ))}
              </MapView>
            </View>
          ) : (
            <View style={styles.locationCard}>
              <View style={styles.locationIconCircle}>
                <Ionicons name="location" size={24} color="#2F4366" />
              </View>
              {userLocation ? (
                <>
                  <Text style={styles.locationTitle}>Your Location</Text>
                  <Text style={styles.locationCoords}>{userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}</Text>
                  <TouchableOpacity
                    style={styles.openMapsButton}
                    onPress={() => {
                      const url = Platform.select({
                        ios: `maps://app?ll=${userLocation.latitude},${userLocation.longitude}`,
                        android: `geo:${userLocation.latitude},${userLocation.longitude}?q=stores+near+me`,
                        default: `https://www.google.com/maps/@${userLocation.latitude},${userLocation.longitude},15z`,
                      });
                      if (url) Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="map" size={16} color="#FFFFFF" />
                    <Text style={styles.openMapsText}>Open in Maps</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.locationTitle}>Location unavailable</Text>
                  <Text style={styles.locationCoords}>Enable location to see distances</Text>
                </>
              )}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="storefront" size={20} color="#2F4366" />
              <Text style={styles.statNumber}>{sorted.length}</Text>
              <Text style={styles.statLabel}>Stores</Text>
            </View>
            {userLocation && (
              <View style={styles.statCard}>
                <Ionicons name="navigate" size={20} color="#27AE60" />
                <Text style={[styles.statNumber, { color: '#27AE60' }]}>{merchantsOnMap.length}</Text>
                <Text style={styles.statLabel}>With Location</Text>
              </View>
            )}
          </View>

          {/* Store list */}
          <Text style={styles.sectionTitle}>All Stampworth Businesses</Text>
          {sorted.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>No stores found</Text></View>
          ) : (
            sorted.map((m) => {
              const dist = getDistance(m);
              const hasCoords = Number.isFinite(m.latitude) && Number.isFinite(m.longitude);
              return (
                <TouchableOpacity key={m.id} style={styles.storeCard} onPress={() => { setSelectedMerchant(m); setModalVisible(true); }}>
                  <View style={styles.storeIconCircle}>
                    {m.logo_url ? (
                      <Image source={{ uri: m.logo_url }} style={styles.storeLogo} contentFit="cover" />
                    ) : (
                      <Ionicons name="storefront" size={20} color="#2F4366" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeName}>{m.business_name}</Text>
                    <Text style={styles.storeAddress} numberOfLines={1}>{formatAddress(m)}</Text>
                  </View>
                  <View style={styles.storeRight}>
                    {dist !== null ? (
                      <Text style={styles.storeDist}>{formatDist(dist)}</Text>
                    ) : hasCoords ? (
                      <Ionicons name="location" size={14} color="#27AE60" />
                    ) : (
                      <Ionicons name="location-outline" size={14} color="#C4CAD4" />
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#C4CAD4" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Detail modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMerchant?.business_name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#8A94A6" /></TouchableOpacity>
            </View>
            {selectedMerchant && (
              <>
                <View style={styles.modalRow}>
                  <Ionicons name="location-outline" size={18} color="#8A94A6" />
                  <Text style={styles.modalText}>{formatAddress(selectedMerchant)}</Text>
                </View>
                {selectedMerchant.phone_number && (
                  <TouchableOpacity style={styles.modalRow} onPress={() => Linking.openURL(`tel:${selectedMerchant.phone_number}`)}>
                    <Ionicons name="call-outline" size={18} color="#2F4366" />
                    <Text style={[styles.modalText, { color: '#2F4366' }]}>{selectedMerchant.phone_number}</Text>
                  </TouchableOpacity>
                )}
                {selectedMerchant.latitude && selectedMerchant.longitude ? (
                  <TouchableOpacity style={styles.navButton} onPress={() => { navigateTo(selectedMerchant); setModalVisible(false); }}>
                    <Ionicons name="navigate" size={18} color="#FFFFFF" />
                    <Text style={styles.navButtonText}>Get Directions</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noLocationBadge}>
                    <Ionicons name="location-outline" size={14} color="#8A94A6" />
                    <Text style={styles.noLocationText}>Location not set by this store</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 20 },
  pageSubtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', paddingHorizontal: 24, marginTop: 4, marginBottom: 16 },

  searchRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },
  refreshButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#2F4366', alignItems: 'center', justifyContent: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  scroll: { paddingBottom: 120 },

  // Map
  mapContainer: { marginHorizontal: 24, height: 340, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  map: { flex: 1 },
  markerPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2F4366', borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  markerLogo: { width: 36, height: 36, borderRadius: 18 },

  // Location card (Expo Go fallback)
  locationCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, gap: 8 },
  locationIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  locationTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  locationCoords: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  openMapsButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2F4366', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  openMapsText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Poppins-SemiBold' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 20, fontWeight: '700', fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  statLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Store list
  sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#2F4366', paddingHorizontal: 24, marginBottom: 12 },
  emptyCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },

  storeCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  storeIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  storeLogo: { width: 44, height: 44, borderRadius: 22 },
  storeName: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  storeAddress: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 2 },
  storeRight: { alignItems: 'flex-end', gap: 4 },
  storeDist: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#2F4366', flex: 1, marginRight: 12 },
  modalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  modalText: { flex: 1, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', lineHeight: 20 },
  navButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, backgroundColor: '#2F4366', marginTop: 8 },
  navButtonText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
  noLocationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F6F8FB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  noLocationText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6' },

  // Nearby alert
  nearbyBanner: { paddingHorizontal: 24, marginBottom: 12 },
  nearbyBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#27AE60', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  nearbyBannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  nearbyBannerTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  nearbyBannerText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
});
