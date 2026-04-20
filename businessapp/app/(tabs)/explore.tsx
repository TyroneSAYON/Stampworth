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
  getNearbyCustomersWithLocation,
} from '@/lib/database';

const NEARBY_REFRESH_MS = 15000; // refresh nearby customers every 15s

let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch {}

let WebView: any = null;
try { WebView = require('react-native-webview').default; } catch {}

const esc = (s: string) => s.replace(/'/g, "&#39;").replace(/"/g, "&quot;");

const buildLeafletHtml = (
  center: { latitude: number; longitude: number },
  storePin: { lat: number; lng: number; name: string; address: string } | null,
  customers: { id: string; lat: number; lng: number; name: string; dist: number | null; inside: boolean }[],
  radius: number,
  userLoc: { latitude: number; longitude: number } | null,
) => {
  const customerMarkers = customers.map((c) => {
    const color = c.inside ? '#27AE60' : '#E74C3C';
    const popup = '<b>' + esc(c.name) + '</b><br/>' + (c.dist !== null ? c.dist + 'm away' : '');
    return `L.circleMarker([${c.lat},${c.lng}],{radius:8,fillColor:'${color}',color:'#fff',weight:2,fillOpacity:1}).addTo(map).bindPopup('${popup}');`;
  }).join('\n');

  // Zoom to fit the geofence radius around the store
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
.cust-green{width:12px;height:12px;position:relative}
.cust-green .dot{width:12px;height:12px;border-radius:50%;background:#27AE60;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);position:absolute;z-index:2}
.cust-green .ring{width:12px;height:12px;border-radius:50%;background:#27AE60;position:absolute;animation:pulse 2.5s ease-out infinite}
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
${customerMarkers}
${userLoc ? `
var userIcon=L.divIcon({className:'',html:'<div class="user-pulse"><div class="ring"></div><div class="dot"></div></div>',iconSize:[14,14],iconAnchor:[7,7]});
L.marker([${userLoc.latitude},${userLoc.longitude}],{icon:userIcon,zIndexOffset:1000}).addTo(map).bindPopup('You (merchant)');
` : ''}
${viewSetup}
<\/script>
</body></html>`;
};

type NearbyCustomer = { id: string; name: string; email: string; latitude: number; longitude: number; updatedAt?: string };

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
  const [nearbyCustomers, setNearbyCustomers] = useState<NearbyCustomer[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(22);
  const [savingLocation, setSavingLocation] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const merchantIdRef = useRef<string | null>(null);

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

    // Start auto-refresh for nearby customers when screen is focused
    refreshIntervalRef.current = setInterval(() => {
      if (merchantIdRef.current) {
        getNearbyCustomersWithLocation(merchantIdRef.current).then(({ data }) => {
          setNearbyCustomers(data || []);
          setLastRefreshed(new Date());
        });
      }
    }, NEARBY_REFRESH_MS);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        <Text style={styles.pageSubtitle}>Your store location and nearby customers</Text>

        {/* Map */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Store Map</Text>
          {nearbyCustomers.length > 0 && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        {WebView ? (() => {
          const mapHtml = buildLeafletHtml(
            mapCenter,
            merchantLat && merchantLng ? { lat: merchantLat, lng: merchantLng, name: merchantName, address: merchantAddress || 'Your store' } : null,
            nearbyCustomers.map((c) => {
              const dist = merchantLat && merchantLng ? haversine(merchantLat, merchantLng, c.latitude, c.longitude) : null;
              return { id: c.id, lat: c.latitude, lng: c.longitude, name: c.name, dist, inside: dist !== null && dist <= geofenceRadius };
            }),
            geofenceRadius,
            userLocation,
          );
          return (
            <View style={styles.mapContainer}>
              <WebView
                key={`map-${merchantLat}-${merchantLng}-${geofenceRadius}-${nearbyCustomers.length}`}
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

            <Text style={styles.geofenceLabel}>Geofence Radius</Text>
            <View style={styles.radiusRow}>
              {[22, 500, 1000, 2000].map((r) => (
                <TouchableOpacity key={r} style={[styles.radiusChip, geofenceRadius === r && styles.radiusChipActive]} onPress={() => setGeofenceRadius(r)}>
                  <Text style={[styles.radiusChipText, geofenceRadius === r && styles.radiusChipTextActive]}>{r}m</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nearby Customers within geofence */}
            {(() => {
              const insideCustomers = nearbyCustomers.filter((c) =>
                merchantLat && merchantLng
                  ? haversine(merchantLat, merchantLng, c.latitude, c.longitude) <= geofenceRadius
                  : false
              );
              const outsideCustomers = nearbyCustomers.filter((c) =>
                merchantLat && merchantLng
                  ? haversine(merchantLat, merchantLng, c.latitude, c.longitude) > geofenceRadius
                  : false
              );

              return (
                <>
                  <View style={styles.geofenceHeaderRow}>
                    <Text style={styles.geofenceSectionTitle}>
                      Nearby Customers
                    </Text>
                    <View style={[styles.geofenceCountBadge, { backgroundColor: insideCustomers.length > 0 ? '#E8F8EE' : '#F0F2F5' }]}>
                      <Text style={[styles.geofenceCountText, { color: insideCustomers.length > 0 ? '#27AE60' : '#8A94A6' }]}>
                        {insideCustomers.length} within {geofenceRadius}m
                      </Text>
                    </View>
                  </View>

                  {insideCustomers.length === 0 && outsideCustomers.length === 0 ? (
                    <View style={styles.geofenceEmpty}>
                      <Ionicons name="location-outline" size={28} color="#C4CAD4" />
                      <Text style={styles.geofenceEmptyTitle}>No customers tracked yet</Text>
                      <Text style={styles.geofenceEmptyText}>Customers using Stampworth with location enabled will appear here</Text>
                    </View>
                  ) : insideCustomers.length === 0 ? (
                    <View style={styles.geofenceEmpty}>
                      <Ionicons name="radio-outline" size={28} color="#C4CAD4" />
                      <Text style={styles.geofenceEmptyTitle}>No customers within {geofenceRadius}m</Text>
                      <Text style={styles.geofenceEmptyText}>{outsideCustomers.length} customer{outsideCustomers.length !== 1 ? 's' : ''} tracked outside the radius</Text>
                    </View>
                  ) : (
                    insideCustomers.map((c) => {
                      const dist = merchantLat && merchantLng ? haversine(merchantLat, merchantLng, c.latitude, c.longitude) : 0;
                      return (
                        <TouchableOpacity key={c.id} style={styles.nearbyRow} onPress={() => viewCustomerCard(c.id)}>
                          <View style={styles.nearbyAvatar}>
                            <Ionicons name="person" size={14} color="#FFFFFF" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.nearbyName}>{c.name}</Text>
                            <Text style={styles.nearbyEmail}>{c.email}</Text>
                          </View>
                          <View style={styles.nearbyDistBadge}>
                            <Ionicons name="navigate-outline" size={10} color="#27AE60" />
                            <Text style={styles.nearbyDistText}>{dist}m</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}

                  {outsideCustomers.length > 0 && insideCustomers.length > 0 && (
                    <Text style={styles.outsideLabel}>{outsideCustomers.length} more outside {geofenceRadius}m radius</Text>
                  )}
                </>
              );
            })()}
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
            <Text style={[styles.statNumber, { color: '#27AE60' }]}>
              {merchantLat && merchantLng
                ? nearbyCustomers.filter((c) => haversine(merchantLat, merchantLng, c.latitude, c.longitude) <= geofenceRadius).length
                : nearbyCustomers.length}
            </Text>
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
              key={`fullmap-${merchantLat}-${merchantLng}-${geofenceRadius}-${nearbyCustomers.length}`}
              source={{ html: buildLeafletHtml(
                mapCenter,
                merchantLat && merchantLng ? { lat: merchantLat, lng: merchantLng, name: merchantName, address: merchantAddress || 'Your store' } : null,
                nearbyCustomers.map((c) => {
                  const dist = merchantLat && merchantLng ? haversine(merchantLat, merchantLng, c.latitude, c.longitude) : null;
                  return { id: c.id, lat: c.latitude, lng: c.longitude, name: c.name, dist, inside: dist !== null && dist <= geofenceRadius };
                }),
                geofenceRadius,
                userLocation,
              )}}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
            />
            {/* Radius chips overlay */}
            <View style={styles.fullscreenRadiusRow}>
              {[22, 500, 1000, 2000].map((r) => (
                <TouchableOpacity key={r} style={[styles.fullscreenRadiusChip, geofenceRadius === r && styles.fullscreenRadiusChipActive]} onPress={() => setGeofenceRadius(r)}>
                  <Text style={[styles.fullscreenRadiusText, geofenceRadius === r && styles.fullscreenRadiusTextActive]}>{r >= 1000 ? `${r / 1000}km` : `${r}m`}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Nearby count badge */}
            <View style={styles.fullscreenBadge}>
              <View style={styles.fullscreenBadgeDot} />
              <Text style={styles.fullscreenBadgeText}>
                {merchantLat && merchantLng
                  ? nearbyCustomers.filter((c) => haversine(merchantLat, merchantLng, c.latitude, c.longitude) <= geofenceRadius).length
                  : 0} nearby
              </Text>
              <Text style={styles.fullscreenBadgeSep}>·</Text>
              <Text style={styles.fullscreenBadgeText}>{nearbyCustomers.length} tracked</Text>
            </View>
            {/* Close button */}
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
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F8EE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#27AE60' },
  liveText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#27AE60', letterSpacing: 0.5 },

  // Map
  mapContainer: { marginHorizontal: 24, height: 450, borderRadius: 16, overflow: 'hidden', marginBottom: 12, backgroundColor: '#E8ECF1' },
  mapExpandBtn: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(47, 67, 102, 0.85)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },

  // Fullscreen map
  fullscreenMap: { flex: 1, backgroundColor: '#000' },
  fullscreenCloseBtn: { position: 'absolute', top: 56, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(47, 67, 102, 0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  fullscreenRadiusRow: { position: 'absolute', top: 56, left: 16, flexDirection: 'row', gap: 6 },
  fullscreenRadiusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },
  fullscreenRadiusChipActive: { backgroundColor: '#2F4366' },
  fullscreenRadiusText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  fullscreenRadiusTextActive: { color: '#FFFFFF' },
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
  storeInfoCoords: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#C4CAD4', marginTop: 2 },

  geofenceLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', paddingHorizontal: 24, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  radiusRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  radiusChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0E4EA' },
  radiusChipActive: { backgroundColor: '#2F4366', borderColor: '#2F4366' },
  radiusChipText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  radiusChipTextActive: { color: '#FFFFFF' },

  geofenceHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 10 },
  geofenceSectionTitle: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  geofenceCountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  geofenceCountText: { fontSize: 11, fontFamily: 'Poppins-SemiBold' },

  geofenceEmpty: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 20, gap: 6 },
  geofenceEmptyTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  geofenceEmptyText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#C4CAD4', textAlign: 'center' },

  nearbyRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  nearbyAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#27AE60', alignItems: 'center', justifyContent: 'center' },
  nearbyName: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  nearbyEmail: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },
  nearbyDistBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E8F8EE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  nearbyDistText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#27AE60' },
  outsideLabel: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center', marginBottom: 20, marginTop: 4 },

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
