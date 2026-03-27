import { useState, useCallback } from 'react';
import { Alert, ActivityIndicator, StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import {
  getMerchantExploreAnalytics,
  searchCustomers,
  getCustomerLoyaltyCardProgress,
  getCurrentMerchantProfile,
  saveMerchantLocation,
  getNearbyCustomersWithLocation,
} from '@/lib/database';

let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch {}

let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
try { const M = require('react-native-maps'); MapView = M.default; Marker = M.Marker; Circle = M.Circle; } catch {}

type NearbyCustomer = { id: string; name: string; email: string; latitude: number; longitude: number };

export default function ExploreScreen() {
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState('Your Store');
  const [merchantAddress, setMerchantAddress] = useState('');
  const [merchantLat, setMerchantLat] = useState<number | null>(null);
  const [merchantLng, setMerchantLng] = useState<number | null>(null);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [mostLoyal, setMostLoyal] = useState<{ name: string; totalStampsEarned: number } | null>(null);
  const [cardHolders, setCardHolders] = useState<any[]>([]);
  const [nearbyCustomers, setNearbyCustomers] = useState<NearbyCustomer[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(500);
  const [savingLocation, setSavingLocation] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Customer card modal
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!loaded) init();
  }, [loaded]));

  const init = async () => {
    setLoading(true);

    // Run all queries in parallel
    const [merchantResult, analyticsResult, locationResult] = await Promise.all([
      getCurrentMerchantProfile(),
      getMerchantExploreAnalytics(),
      Location ? Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
        if (status === 'granted') return Location!.getCurrentPositionAsync({});
        return null;
      }).catch(() => null) : Promise.resolve(null),
    ]);

    const merchant = merchantResult.data;
    if (merchant) {
      setMerchantId(merchant.id);
      setMerchantName(merchant.business_name || 'Your Store');
      setMerchantAddress(merchant.address || '');
      if (merchant.latitude && merchant.longitude) {
        setMerchantLat(merchant.latitude);
        setMerchantLng(merchant.longitude);
      }
    }

    if (analyticsResult.data) {
      setTotalRedeemed(analyticsResult.data.totalRedeemed);
      setMostLoyal(analyticsResult.data.mostLoyal);
      setCardHolders(analyticsResult.data.cardHolders);
    }

    if (locationResult?.coords) {
      setUserLocation({ latitude: locationResult.coords.latitude, longitude: locationResult.coords.longitude });
    }

    // Nearby customers in background (don't block render)
    if (merchant) {
      getNearbyCustomersWithLocation(merchant.id).then(({ data }) => setNearbyCustomers(data || []));
    }

    setLoading(false);
    setLoaded(true);
  };

  const refresh = () => { setLoaded(false); };

  const handlePinLocation = async () => {
    if (!userLocation) { Alert.alert('No location', 'Enable location services first.'); return; }
    setSavingLocation(true);
    const { error } = await saveMerchantLocation(userLocation.latitude, userLocation.longitude);
    setSavingLocation(false);
    if (error) { Alert.alert('Failed', error.message); return; }
    setMerchantLat(userLocation.latitude);
    setMerchantLng(userLocation.longitude);
    Alert.alert('Location Saved', `${merchantName} is now pinned on the map.\nCustomers can see your store in the Explore tab.`);
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await searchCustomers(q);
    setSearchResults(data || []);
    setSearching(false);
  }, []);

  const viewCustomerCard = async (customerId: string) => {
    if (!merchantId) return;
    setLoadingCard(true); setCardModalVisible(true);
    const { data, error } = await getCustomerLoyaltyCardProgress(merchantId, customerId);
    setLoadingCard(false);
    if (error || !data) { Alert.alert('Error', error?.message || 'Could not load.'); setCardModalVisible(false); return; }
    setSelectedCard(data);
  };

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  if (loading) {
    return <ThemedView style={styles.container}><View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /></View></ThemedView>;
  }

  const mapCenter = merchantLat && merchantLng
    ? { latitude: merchantLat, longitude: merchantLng }
    : userLocation || { latitude: 14.5995, longitude: 120.9842 };

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
            <Text style={styles.brandName}>Stampworth</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/options')}>
            <Ionicons name="storefront" size={18} color="#2F4366" />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Explore</Text>
        <Text style={styles.pageSubtitle}>Your store location and nearby customers</Text>

        {/* Map */}
        <Text style={styles.sectionTitle}>Store Map</Text>
        {MapView ? (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{ ...mapCenter, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              showsUserLocation={!!userLocation}
              showsMyLocationButton={false}
            >
              {/* Business pin */}
              {merchantLat && merchantLng && (
                <>
                  <Marker
                    coordinate={{ latitude: merchantLat, longitude: merchantLng }}
                    title={merchantName}
                    description={merchantAddress || 'Your store location'}
                  >
                    <View style={styles.storePin}>
                      <Ionicons name="storefront" size={16} color="#FFFFFF" />
                    </View>
                  </Marker>
                  <Circle
                    center={{ latitude: merchantLat, longitude: merchantLng }}
                    radius={geofenceRadius}
                    strokeColor="rgba(47,67,102,0.5)"
                    fillColor="rgba(47,67,102,0.08)"
                    strokeWidth={2}
                  />
                </>
              )}

              {/* Nearby customer pins */}
              {nearbyCustomers.map((c) => {
                const dist = merchantLat && merchantLng ? haversine(merchantLat, merchantLng, c.latitude, c.longitude) : null;
                const inside = dist !== null && dist <= geofenceRadius;
                return (
                  <Marker
                    key={c.id}
                    coordinate={{ latitude: c.latitude, longitude: c.longitude }}
                    title={c.name}
                    description={dist !== null ? `${dist}m away` : c.email}
                  >
                    <View style={[styles.customerPin, { backgroundColor: inside ? '#27AE60' : '#E74C3C' }]}>
                      <Ionicons name="person" size={12} color="#FFFFFF" />
                    </View>
                  </Marker>
                );
              })}
            </MapView>
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={36} color="#C4CAD4" />
            <Text style={styles.placeholderText}>Map requires a dev build with react-native-maps</Text>
            {userLocation && <Text style={styles.coordsText}>{userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}</Text>}
          </View>
        )}

        {/* Pin / Radius controls */}
        <View style={styles.mapControls}>
          {!merchantLat || !merchantLng ? (
            <TouchableOpacity style={styles.pinButton} onPress={handlePinLocation} disabled={savingLocation || !userLocation}>
              <Ionicons name="location" size={18} color="#FFFFFF" />
              <Text style={styles.pinButtonText}>{savingLocation ? 'Saving...' : 'Pin My Store Location'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.pinButton, { backgroundColor: '#8A94A6' }]} onPress={handlePinLocation} disabled={savingLocation || !userLocation}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.pinButtonText}>{savingLocation ? 'Updating...' : 'Update Location'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {merchantLat && merchantLng && (
          <>
            <View style={styles.storeInfoCard}>
              <Ionicons name="storefront" size={20} color="#2F4366" />
              <View style={{ flex: 1 }}>
                <Text style={styles.storeInfoName}>{merchantName}</Text>
                <Text style={styles.storeInfoAddress}>{merchantAddress || 'No address set'}</Text>
                <Text style={styles.storeInfoCoords}>{merchantLat.toFixed(5)}, {merchantLng.toFixed(5)}</Text>
              </View>
            </View>

            <View style={styles.radiusRow}>
              {[200, 500, 1000, 2000].map((r) => (
                <TouchableOpacity key={r} style={[styles.radiusChip, geofenceRadius === r && styles.radiusChipActive]} onPress={() => setGeofenceRadius(r)}>
                  <Text style={[styles.radiusChipText, geofenceRadius === r && styles.radiusChipTextActive]}>{r}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Analytics */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#E8F4FD' }]}>
            <Ionicons name="people" size={20} color="#2F4366" />
            <Text style={[styles.statNumber, { color: '#2F4366' }]}>{cardHolders.length}</Text>
            <Text style={styles.statLabel}>Card Holders</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E8F8EE' }]}>
            <Ionicons name="navigate" size={20} color="#27AE60" />
            <Text style={[styles.statNumber, { color: '#27AE60' }]}>{nearbyCustomers.length}</Text>
            <Text style={styles.statLabel}>Tracked</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF4E6' }]}>
            <Ionicons name="gift" size={20} color="#E67E22" />
            <Text style={[styles.statNumber, { color: '#E67E22' }]}>{totalRedeemed}</Text>
            <Text style={styles.statLabel}>Redeemed</Text>
          </View>
        </View>

        {mostLoyal && (
          <View style={styles.loyalCard}>
            <View style={styles.loyalBadge}><Ionicons name="trophy" size={16} color="#E67E22" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.loyalLabel}>Most Loyal</Text>
              <Text style={styles.loyalName}>{mostLoyal.name}</Text>
            </View>
            <Text style={styles.loyalStamps}>{mostLoyal.totalStampsEarned} stamps</Text>
          </View>
        )}

        {/* Search */}
        <Text style={styles.sectionTitle}>Search Customers</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#B0B8C4" />
          <TextInput value={searchQuery} onChangeText={handleSearch} style={styles.searchInput} placeholder="Search by name or email..." placeholderTextColor="#C4CAD4" autoCapitalize="none" />
          {searching && <ActivityIndicator size="small" color="#2F4366" />}
        </View>
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((c) => (
              <TouchableOpacity key={c.id} style={styles.searchRow} onPress={() => { viewCustomerCard(c.id); setSearchQuery(''); setSearchResults([]); }}>
                <View style={styles.searchAvatar}><Ionicons name="person" size={14} color="#2F4366" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchName}>{c.full_name || c.username || 'Unknown'}</Text>
                  <Text style={styles.searchEmail}>{c.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C4CAD4" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Card holders */}
        <Text style={styles.sectionTitle}>Loyalty Card Holders</Text>
        {cardHolders.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No card holders yet</Text></View>
        ) : (
          cardHolders.map((c: any) => (
            <TouchableOpacity key={c.customerId} style={styles.customerRow} onPress={() => viewCustomerCard(c.customerId)}>
              <View style={[styles.customerAvatar, { backgroundColor: c.isFreeRedemption ? '#FFF4E6' : '#E8F4FD' }]}>
                <Ionicons name={c.isFreeRedemption ? 'gift' : 'person'} size={14} color={c.isFreeRedemption ? '#E67E22' : '#2F4366'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{c.name}</Text>
                <Text style={styles.customerSub}>{c.stampCount} stamps</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4CAD4" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Customer card modal */}
      <Modal visible={cardModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {loadingCard ? (
              <View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /></View>
            ) : selectedCard ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Loyalty Card</Text>
                  <TouchableOpacity onPress={() => { setCardModalVisible(false); setSelectedCard(null); }}>
                    <Ionicons name="close" size={24} color="#8A94A6" />
                  </TouchableOpacity>
                </View>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Ionicons name="person-circle" size={52} color="#2F4366" />
                  <Text style={styles.modalName}>{selectedCard.customer.full_name || selectedCard.customer.username || 'Customer'}</Text>
                  <Text style={styles.modalEmail}>{selectedCard.customer.email}</Text>
                </View>
                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatNumber}>{selectedCard.stampCount}</Text>
                    <Text style={styles.modalStatLabel}>Current</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatNumber}>{selectedCard.stampsPerRedemption}</Text>
                    <Text style={styles.modalStatLabel}>Required</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (selectedCard.stampCount / selectedCard.stampsPerRedemption) * 100)}%` }]} />
                </View>
                {selectedCard.rewardDescription && (
                  <View style={styles.rewardBadge}>
                    <Ionicons name="gift-outline" size={14} color="#E67E22" />
                    <Text style={styles.rewardText}>{selectedCard.rewardDescription}</Text>
                  </View>
                )}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 200 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E4EA' },

  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 20 },
  pageSubtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', paddingHorizontal: 24, marginTop: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#2F4366', paddingHorizontal: 24, marginBottom: 12, marginTop: 8 },

  // Map
  mapContainer: { marginHorizontal: 24, height: 300, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  map: { flex: 1 },
  storePin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2F4366', borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  customerPin: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  mapPlaceholder: { marginHorizontal: 24, height: 180, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 8 },
  placeholderText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#C4CAD4', textAlign: 'center' },
  coordsText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#B0B8C4' },

  mapControls: { paddingHorizontal: 24, marginBottom: 16 },
  pinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, backgroundColor: '#2F4366' },
  pinButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Poppins-SemiBold' },

  storeInfoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12 },
  storeInfoName: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  storeInfoAddress: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },
  storeInfoCoords: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#C4CAD4', marginTop: 2 },

  radiusRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 20 },
  radiusChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0E4EA' },
  radiusChipActive: { backgroundColor: '#2F4366', borderColor: '#2F4366' },
  radiusChipText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  radiusChipTextActive: { color: '#FFFFFF' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 20, fontWeight: '700', fontFamily: 'Poppins-SemiBold' },
  statLabel: { fontSize: 9, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5 },

  loyalCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 20, gap: 10 },
  loyalBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF4E6', alignItems: 'center', justifyContent: 'center' },
  loyalLabel: { fontSize: 9, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5 },
  loyalName: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', marginTop: 1 },
  loyalStamps: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#E67E22' },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, height: 46, gap: 10, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },
  searchResults: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  searchAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center' },
  searchName: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  searchEmail: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6' },

  // Card holders
  customerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  customerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  customerName: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  customerSub: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },
  emptyCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, minHeight: 350 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  modalName: { fontSize: 17, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', marginTop: 8 },
  modalEmail: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 2 },
  modalStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalStat: { flex: 1, alignItems: 'center' },
  modalStatNumber: { fontSize: 22, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  modalStatLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', marginTop: 2 },
  modalStatDivider: { width: 1, height: 28, backgroundColor: '#E0E4EA' },
  progressBar: { height: 6, backgroundColor: '#F0F2F5', borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#2F4366', borderRadius: 3 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF4E6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'center' },
  rewardText: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#E67E22' },
});
