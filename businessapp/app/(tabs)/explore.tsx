import { useState, useCallback } from 'react';
import { Alert, ActivityIndicator, StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { getMerchantExploreAnalytics, searchCustomers, getCustomerLoyaltyCardProgress, getCurrentMerchantProfile } from '@/lib/database';

let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch {}

let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
try { const M = require('react-native-maps'); MapView = M.default; Marker = M.Marker; Circle = M.Circle; } catch {}

type CardHolder = {
  customerId: string;
  name: string;
  email: string;
  stampCount: number;
  totalStampsEarned: number;
  status: string;
  isFreeRedemption: boolean;
};

type CustomerCardDetail = {
  customer: any;
  stampCount: number;
  stampsPerRedemption: number;
  rewardDescription?: string | null;
  freeRedemptionReached: boolean;
} | null;

export default function ExploreScreen() {
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [mostLoyal, setMostLoyal] = useState<{ name: string; totalStampsEarned: number } | null>(null);
  const [cardHolders, setCardHolders] = useState<CardHolder[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState(500);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Customer card modal
  const [selectedCard, setSelectedCard] = useState<CustomerCardDetail>(null);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);

  useFocusEffect(
    useCallback(() => {
      init();
    }, [])
  );

  const init = async () => {
    setLoading(true);
    const { data: merchant } = await getCurrentMerchantProfile();
    if (merchant) setMerchantId(merchant.id);

    const { data } = await getMerchantExploreAnalytics();
    if (data) {
      setTotalRedeemed(data.totalRedeemed);
      setMostLoyal(data.mostLoyal);
      setCardHolders(data.cardHolders);
    }

    if (Location) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
        } catch {}
      }
    }
    setLoading(false);
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
    setLoadingCard(true);
    setCardModalVisible(true);
    const { data, error } = await getCustomerLoyaltyCardProgress(merchantId, customerId);
    setLoadingCard(false);
    if (error || !data) {
      Alert.alert('Error', error?.message || 'Could not load customer card.');
      setCardModalVisible(false);
      return;
    }
    setSelectedCard(data);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /><Text style={styles.loadingText}>Loading explore...</Text></View>
      </ThemedView>
    );
  }

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
        <Text style={styles.pageSubtitle}>Analytics and loyalty card holders</Text>

        {/* Analytics */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#E8F4FD' }]}>
            <Ionicons name="people" size={22} color="#2F4366" />
            <Text style={[styles.statNumber, { color: '#2F4366' }]}>{cardHolders.length}</Text>
            <Text style={styles.statLabel}>Card Holders</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF4E6' }]}>
            <Ionicons name="gift" size={22} color="#E67E22" />
            <Text style={[styles.statNumber, { color: '#E67E22' }]}>{totalRedeemed}</Text>
            <Text style={styles.statLabel}>Redeemed</Text>
          </View>
        </View>

        {/* Most loyal */}
        {mostLoyal && (
          <View style={styles.loyalCard}>
            <View style={styles.loyalBadge}><Ionicons name="trophy" size={18} color="#E67E22" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.loyalLabel}>Most Loyal Customer</Text>
              <Text style={styles.loyalName}>{mostLoyal.name}</Text>
            </View>
            <Text style={styles.loyalStamps}>{mostLoyal.totalStampsEarned} stamps</Text>
          </View>
        )}

        {/* Search */}
        <Text style={styles.sectionTitle}>Search Customers</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#B0B8C4" />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#C4CAD4"
            autoCapitalize="none"
          />
          {searching && <ActivityIndicator size="small" color="#2F4366" />}
        </View>

        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((c) => (
              <TouchableOpacity key={c.id} style={styles.searchRow} onPress={() => { viewCustomerCard(c.id); setSearchQuery(''); setSearchResults([]); }}>
                <View style={styles.searchAvatar}><Ionicons name="person" size={16} color="#2F4366" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchName}>{c.full_name || c.username || 'Unknown'}</Text>
                  <Text style={styles.searchEmail}>{c.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C4CAD4" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Map */}
        {location && MapView ? (
          <>
            <Text style={styles.sectionTitle}>Store Map</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
              >
                <Marker coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }} title="Your Store" pinColor="#2F4366" />
                <Circle center={{ latitude: location.coords.latitude, longitude: location.coords.longitude }} radius={geofenceRadius} strokeColor="rgba(47,67,102,0.6)" fillColor="rgba(47,67,102,0.08)" strokeWidth={2} />
              </MapView>
            </View>
            <View style={styles.radiusRow}>
              {[200, 500, 1000, 2000].map((r) => (
                <TouchableOpacity key={r} style={[styles.radiusChip, geofenceRadius === r && styles.radiusChipActive]} onPress={() => setGeofenceRadius(r)}>
                  <Text style={[styles.radiusChipText, geofenceRadius === r && styles.radiusChipTextActive]}>{r}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : location ? (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={36} color="#C4CAD4" />
            <Text style={styles.placeholderText}>Map requires a dev build with react-native-maps</Text>
            <Text style={styles.coordsText}>{location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}</Text>
          </View>
        ) : null}

        {/* Loyalty card holders */}
        <Text style={styles.sectionTitle}>Loyalty Card Holders</Text>
        {cardHolders.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No card holders yet</Text></View>
        ) : (
          cardHolders.map((c) => (
            <TouchableOpacity key={c.customerId} style={styles.customerRow} onPress={() => viewCustomerCard(c.customerId)}>
              <View style={[styles.customerAvatar, { backgroundColor: c.isFreeRedemption ? '#FFF4E6' : '#E8F4FD' }]}>
                <Ionicons name={c.isFreeRedemption ? 'gift' : 'person'} size={16} color={c.isFreeRedemption ? '#E67E22' : '#2F4366'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{c.name}</Text>
                <Text style={styles.customerSub}>{c.stampCount} stamps{c.isFreeRedemption ? ' - FREE REDEMPTION' : ''}</Text>
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
                <View style={styles.modalAvatar}>
                  <Ionicons name="person-circle" size={56} color="#2F4366" />
                </View>
                <Text style={styles.modalName}>{selectedCard.customer.full_name || selectedCard.customer.username || 'Customer'}</Text>
                <Text style={styles.modalEmail}>{selectedCard.customer.email}</Text>

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
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStat}>
                    <Text style={[styles.modalStatNumber, selectedCard.freeRedemptionReached && { color: '#27AE60' }]}>{selectedCard.freeRedemptionReached ? 'Yes' : 'No'}</Text>
                    <Text style={styles.modalStatLabel}>Free</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (selectedCard.stampCount / selectedCard.stampsPerRedemption) * 100)}%` }]} />
                </View>
                <Text style={styles.progressText}>{selectedCard.stampCount} / {selectedCard.stampsPerRedemption} stamps collected</Text>

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
  loadingText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E4EA' },

  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 20 },
  pageSubtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', paddingHorizontal: 24, marginTop: 4, marginBottom: 20 },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 6 },
  statNumber: { fontSize: 22, fontWeight: '700', fontFamily: 'Poppins-SemiBold' },
  statLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Most loyal
  loyalCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 20, gap: 12 },
  loyalBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF4E6', alignItems: 'center', justifyContent: 'center' },
  loyalLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5 },
  loyalName: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', marginTop: 2 },
  loyalStamps: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#E67E22' },

  sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#2F4366', paddingHorizontal: 24, marginBottom: 12, marginTop: 8 },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, height: 48, gap: 10, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },
  searchResults: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  searchAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center' },
  searchName: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  searchEmail: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6' },

  // Map
  mapContainer: { marginHorizontal: 24, borderRadius: 16, overflow: 'hidden', height: 220, marginBottom: 12 },
  map: { flex: 1 },
  mapPlaceholder: { marginHorizontal: 24, height: 140, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8 },
  placeholderText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#C4CAD4', textAlign: 'center' },
  coordsText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#B0B8C4' },
  radiusRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 20 },
  radiusChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0E4EA' },
  radiusChipActive: { backgroundColor: '#2F4366', borderColor: '#2F4366' },
  radiusChipText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  radiusChipTextActive: { color: '#FFFFFF' },

  // Card holders
  customerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  customerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  customerName: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  customerSub: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },
  emptyCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 48, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  modalAvatar: { alignSelf: 'center', marginBottom: 8 },
  modalName: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', textAlign: 'center' },
  modalEmail: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center', marginBottom: 20 },
  modalStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  modalStat: { flex: 1, alignItems: 'center' },
  modalStatNumber: { fontSize: 24, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  modalStatLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', marginTop: 2 },
  modalStatDivider: { width: 1, height: 32, backgroundColor: '#E0E4EA' },
  progressBar: { height: 8, backgroundColor: '#F0F2F5', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#2F4366', borderRadius: 4 },
  progressText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center', marginBottom: 16 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF4E6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'center' },
  rewardText: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#E67E22' },
});
