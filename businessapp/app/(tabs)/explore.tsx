import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
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
  getNearbyCustomerCount,
} from '@/lib/database';
import { supabase } from '@/lib/supabase';

const NEARBY_REFRESH_MS = 15000;
const SLIDER_MAX = 2000;

const formatRadius = (v: number) => {
  if (v < 1000) return `${v}m`;
  return v % 1000 === 0 ? `${v / 1000}km` : `${(v / 1000).toFixed(1)}km`;
};

let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch {}

let WebView: any = null;
try { WebView = require('react-native-webview').default; } catch {}

const esc = (s: string) => s.replace(/'/g, "&#39;").replace(/"/g, "&quot;");

const buildLeafletHtml = (
  center: { latitude: number; longitude: number },
  storePin: { lat: number; lng: number; name: string; address: string } | null,
  radius: number,
  userLoc: { latitude: number; longitude: number } | null,
) => {
  let viewSetup = '';
  if (storePin) {
    viewSetup = `var rc=L.circle([${storePin.lat},${storePin.lng}],{radius:${Math.max(radius, 200)}}).addTo(map).remove();map.fitBounds(rc.getBounds(),{padding:[30,30],maxZoom:17});`;
  }

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
html,body,#map{width:100%;height:100%;margin:0;padding:0;}
@keyframes pulse{0%{transform:scale(1);opacity:0.5}100%{transform:scale(3);opacity:0}}
.store-pin{width:28px;height:28px;position:relative}
.store-pin .dot{width:28px;height:28px;border-radius:50%;background:#2F4366;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;position:absolute;z-index:2}
.store-pin .dot svg{width:14px;height:14px}
.user-pulse{width:14px;height:14px;position:relative}
.user-pulse .dot{width:14px;height:14px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);position:absolute;z-index:2}
.user-pulse .ring{width:14px;height:14px;border-radius:50%;background:#4285F4;position:absolute;animation:pulse 2s ease-out infinite}
</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${center.latitude},${center.longitude}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
${storePin ? `
var storeIcon=L.divIcon({className:'',html:'<div class="store-pin"><div class="dot"><svg viewBox="0 0 24 24" fill="white"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg></div></div>',iconSize:[28,28],iconAnchor:[14,14]});
L.marker([${storePin.lat},${storePin.lng}],{icon:storeIcon,zIndexOffset:900}).addTo(map).bindPopup('<b>${esc(storePin.name)}</b><br/>${esc(storePin.address)}');
L.circle([${storePin.lat},${storePin.lng}],{radius:${radius},color:'#2F4366',fillColor:'#2F4366',fillOpacity:0.06,weight:1.5,dashArray:'6,4'}).addTo(map);
` : ''}
${userLoc ? `
var userIcon=L.divIcon({className:'',html:'<div class="user-pulse"><div class="ring"></div><div class="dot"></div></div>',iconSize:[14,14],iconAnchor:[7,7]});
L.marker([${userLoc.latitude},${userLoc.longitude}],{icon:userIcon,zIndexOffset:1000}).addTo(map).bindPopup('You (merchant)');
` : ''}
${viewSetup}
<\/script>
</body></html>`;
};

export default function ExploreScreen() {
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState('Your Store');
  const [merchantAddress, setMerchantAddress] = useState('');
  const [merchantLat, setMerchantLat] = useState<number | null>(null);
  const [merchantLng, setMerchantLng] = useState<number | null>(null);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [mostLoyal, setMostLoyal] = useState<{ name: string; totalStampsEarned: number } | null>(null);
  const [cardHolders, setCardHolders] = useState<any[]>([]);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(500);
  const [sliderWidth, setSliderWidth] = useState(1);
  const [draftRadius, setDraftRadius] = useState<number | null>(null);
  const activeRadius = draftRadius ?? geofenceRadius;
  const [savingLocation, setSavingLocation] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const merchantIdRef = useRef<string | null>(null);
  const geofenceRadiusRef = useRef(500);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);

  const refreshNearby = useCallback(() => {
    if (merchantIdRef.current) {
      getNearbyCustomerCount(merchantIdRef.current, geofenceRadiusRef.current).then(({ count }) => {
        setNearbyCount(count);
      });
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (!loaded) init();
    refreshIntervalRef.current = setInterval(refreshNearby, NEARBY_REFRESH_MS);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [loaded]));

  useEffect(() => {
    const channel = supabase
      .channel('explore-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_locations' }, refreshNearby)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, refreshNearby)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshNearby]);

  const init = async () => {
    setLoading(true);

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
      merchantIdRef.current = merchant.id;
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

    if (merchant) {
      getNearbyCustomerCount(merchant.id, geofenceRadiusRef.current).then(({ count }) => setNearbyCount(count));
    }

    setLoading(false);
    setLoaded(true);
  };

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

  if (loading) {
    return <ThemedView style={styles.container}><View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /></View></ThemedView>;
  }

  const mapCenter = merchantLat && merchantLng
    ? { latitude: merchantLat, longitude: merchantLng }
    : userLocation || { latitude: 14.5995, longitude: 120.9842 };

  const storePin = merchantLat && merchantLng
    ? { lat: merchantLat, lng: merchantLng, name: merchantName, address: merchantAddress || 'Your store' }
    : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ThemedView style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
            <Text style={styles.brandName}>Stampworth Business</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/options')}>
            <Ionicons name="storefront" size={18} color="#2F4366" />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Explore</Text>
        <Text style={styles.pageSubtitle}>Your store location and nearby customer analytics</Text>

        {/* Map */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Store Map</Text>
        </View>
        {WebView ? (() => {
          const mapHtml = buildLeafletHtml(mapCenter, storePin, geofenceRadius, userLocation);
          return (
            <View style={styles.mapContainer}>
              <WebView
                key={`map-${merchantLat}-${merchantLng}-${geofenceRadius}`}
                source={{ html: mapHtml }}
                style={{ flex: 1 }}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                originWhitelist={['*']}
                nestedScrollEnabled={false}
              />
              <TouchableOpacity style={styles.mapExpandBtn} onPress={() => setMapFullscreen(true)}>
                <Ionicons name="expand" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          );
        })() : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={36} color="#C4CAD4" />
            <Text style={styles.placeholderText}>Map unavailable</Text>
          </View>
        )}

        {/* Pin location control */}
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
              </View>
            </View>

            {/* Geofence radius slider */}
            <View style={styles.radiusSection}>
              <View style={styles.radiusHeaderRow}>
                <Text style={styles.geofenceLabel}>Geofence Radius</Text>
                <View style={styles.radiusValueBadge}>
                  <Text style={styles.radiusValueText}>{formatRadius(activeRadius)}</Text>
                </View>
              </View>
              <View
                style={styles.sliderOuter}
                onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => setDraftRadius(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / sliderWidth)) * SLIDER_MAX))}
                onResponderMove={(e) => setDraftRadius(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / sliderWidth)) * SLIDER_MAX))}
                onResponderRelease={(e) => {
                  const v = Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / sliderWidth)) * SLIDER_MAX);
                  setDraftRadius(null);
                  setGeofenceRadius(v);
                  geofenceRadiusRef.current = v;
                  if (merchantIdRef.current) {
                    getNearbyCustomerCount(merchantIdRef.current, v).then(({ count }) => setNearbyCount(count));
                  }
                }}
              >
                <View style={styles.sliderTrack} pointerEvents="none">
                  <View style={[styles.sliderFill, { width: `${(activeRadius / SLIDER_MAX) * 100}%` }]} />
                </View>
                <View style={[styles.sliderThumb, { left: (activeRadius / SLIDER_MAX) * Math.max(0, sliderWidth - 22) }]} pointerEvents="none" />
              </View>
              <View style={styles.sliderRangeRow}>
                <Text style={styles.sliderRangeText}>0m</Text>
                <Text style={styles.sliderRangeText}>2km</Text>
              </View>
            </View>

            {/* Nearby customer analytics — privacy-preserving aggregate only */}
            <View style={styles.nearbyCard}>
              <View style={styles.nearbyCardHeader}>
                <Text style={styles.nearbyCardTitle}>Nearby Customers</Text>
                <View style={styles.privacyBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#27AE60" />
                  <Text style={styles.privacyBadgeText}>Privacy Protected</Text>
                </View>
              </View>

              {nearbyCount > 0 ? (
                <View style={styles.nearbyCountRow}>
                  <View style={styles.nearbyCountCircle}>
                    <Text style={styles.nearbyCountNumber}>{nearbyCount}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.nearbyCountLabel}>
                      {nearbyCount === 1
                        ? 'There is 1 nearby customer'
                        : `There are ${nearbyCount} nearby customers`}
                    </Text>
                    <Text style={styles.nearbyCountSub}>within your {formatRadius(geofenceRadius)} radius</Text>
                  </View>
                  <Ionicons name="people" size={22} color="#2F4366" style={{ opacity: 0.35 }} />
                </View>
              ) : (
                <View style={styles.nearbyEmptyRow}>
                  <Ionicons name="radio-outline" size={22} color="#C4CAD4" />
                  <Text style={styles.nearbyEmptyText}>
                    No customers detected within {formatRadius(geofenceRadius)}
                  </Text>
                </View>
              )}

              <Text style={styles.nearbyDisclaimer}>
                Only aggregate presence counts are shown. No identities, coordinates, or movement data are accessible.
              </Text>
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
            <Text style={[styles.statNumber, { color: '#27AE60' }]}>{nearbyCount}</Text>
            <Text style={styles.statLabel}>Nearby</Text>
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

      {/* Fullscreen map modal */}
      {WebView && (
        <Modal visible={mapFullscreen} animationType="slide" onRequestClose={() => setMapFullscreen(false)}>
          <View style={styles.fullscreenMap}>
            <WebView
              key={`fullmap-${merchantLat}-${merchantLng}-${geofenceRadius}`}
              source={{ html: buildLeafletHtml(mapCenter, storePin, geofenceRadius, userLocation) }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
            />
            <View style={styles.fullscreenBadge}>
              <View style={styles.fullscreenBadgeDot} />
              <Text style={styles.fullscreenBadgeText}>{nearbyCount} nearby</Text>
              <Text style={styles.fullscreenBadgeSep}>·</Text>
              <Text style={styles.fullscreenBadgeText}>{formatRadius(geofenceRadius)} radius</Text>
            </View>
            <TouchableOpacity style={styles.fullscreenCloseBtn} onPress={() => setMapFullscreen(false)}>
              <Ionicons name="contract" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}

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
    </KeyboardAvoidingView>
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
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#2F4366', paddingHorizontal: 24, marginBottom: 12, marginTop: 8 },

  mapContainer: { marginHorizontal: 24, height: 450, borderRadius: 16, overflow: 'hidden', marginBottom: 12, backgroundColor: '#E8ECF1' },
  mapExpandBtn: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(47, 67, 102, 0.85)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },

  fullscreenMap: { flex: 1, backgroundColor: '#000' },
  fullscreenCloseBtn: { position: 'absolute', top: 56, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(47, 67, 102, 0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  fullscreenBadge: { position: 'absolute', bottom: 40, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(47, 67, 102, 0.9)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  fullscreenBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27AE60' },
  fullscreenBadgeText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  fullscreenBadgeSep: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },

  mapPlaceholder: { marginHorizontal: 24, height: 180, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 8 },
  placeholderText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#C4CAD4', textAlign: 'center' },

  mapControls: { paddingHorizontal: 24, marginBottom: 16 },
  pinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, backgroundColor: '#2F4366' },
  pinButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Poppins-SemiBold' },

  storeInfoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12 },
  storeInfoName: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  storeInfoAddress: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },

  geofenceLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', letterSpacing: 0.5, textTransform: 'uppercase' },
  radiusSection: { paddingHorizontal: 24, marginBottom: 16 },
  radiusHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  radiusValueBadge: { backgroundColor: '#2F4366', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  radiusValueText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  sliderOuter: { height: 32, justifyContent: 'center', position: 'relative' },
  sliderTrack: { height: 6, backgroundColor: '#DDE3EF', borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: 6, backgroundColor: '#2F4366', borderRadius: 3 },
  sliderThumb: { position: 'absolute', top: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: '#2F4366', shadowColor: '#2F4366', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  sliderRangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderRangeText: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#A0A8B5' },

  // Privacy-preserving nearby analytics card
  nearbyCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  nearbyCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  nearbyCardTitle: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  privacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F8EE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  privacyBadgeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#27AE60' },
  nearbyCountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  nearbyCountCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEF2F8', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#2F4366' },
  nearbyCountNumber: { fontSize: 22, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  nearbyCountLabel: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  nearbyCountSub: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  nearbyEmptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  nearbyEmptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', flex: 1 },
  nearbyDisclaimer: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#B0B8C4', borderTopWidth: 1, borderTopColor: '#F0F2F5', paddingTop: 10 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 20, fontWeight: '700', fontFamily: 'Poppins-SemiBold' },
  statLabel: { fontSize: 9, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5 },

  loyalCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 20, gap: 10 },
  loyalBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF4E6', alignItems: 'center', justifyContent: 'center' },
  loyalLabel: { fontSize: 9, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5 },
  loyalName: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', marginTop: 1 },
  loyalStamps: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#E67E22' },

  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, height: 46, gap: 10, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },
  searchResults: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  searchAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center' },
  searchName: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  searchEmail: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6' },

  customerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  customerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  customerName: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  customerSub: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },
  emptyCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },

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
