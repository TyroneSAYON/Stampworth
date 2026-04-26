import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getAllMerchants } from '@/lib/database';
import { getGeofenceRadius, setGeofenceRadius, checkNearbyStores } from '@/lib/geofence';

const RADIUS_OPTIONS = [
  { label: '22m', value: 22 },
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
];

// Persists across remounts — stores that already triggered an alert this session
const alertedStoresThisSession = new Set<string>();

let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch {}

let WebView: any = null;
try { WebView = require('react-native-webview').default; } catch {}

const esc = (s: string) => s.replace(/'/g, "&#39;").replace(/"/g, "&quot;");

const buildLeafletHtml = (
  center: { latitude: number; longitude: number },
  stores: { id: string; lat: number; lng: number; name: string; address: string; logoUrl?: string | null; dist: string }[],
  radiusMeters: number,
  userLoc: { latitude: number; longitude: number } | null,
) => {
  const storeMarkers = stores.map((s) => {
    const popup = '<b>' + esc(s.name) + '</b><br/>' + esc(s.address) + '<br/><span style="color:#2F4366;font-weight:600">' + s.dist + '</span>';
    if (s.logoUrl) {
      return `(function(){
        var el='<div style="width:34px;height:34px;border-radius:50%;border:3px solid #fff;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.3);background:#2F4366;display:flex;align-items:center;justify-content:center"><img src="${esc(s.logoUrl)}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\\'none\\'"/></div>';
        var ic=L.divIcon({className:'',html:el,iconSize:[34,34],iconAnchor:[17,17]});
        L.marker([${s.lat},${s.lng}],{icon:ic}).addTo(map).bindPopup('${popup}');
      })();`;
    }
    return `L.circleMarker([${s.lat},${s.lng}],{radius:12,fillColor:'#2F4366',color:'#fff',weight:3,fillOpacity:1}).addTo(map).bindPopup('${popup}');`;
  }).join('\n');

  // Zoom: fit radius circle around user, or show nearby stores
  let viewSetup: string;
  if (userLoc) {
    // Zoom to fit the geofence radius around user location
    viewSetup = `
      var radiusCircle = L.circle([${userLoc.latitude},${userLoc.longitude}],{radius:${radiusMeters},color:'#2F4366',fillColor:'#2F4366',fillOpacity:0.06,weight:1.5,dashArray:'6,4'}).addTo(map);
      map.fitBounds(radiusCircle.getBounds(),{padding:[30,30],maxZoom:17});
    `;
  } else if (stores.length > 0) {
    const bounds = stores.map((s) => `[${s.lat},${s.lng}]`);
    viewSetup = `map.fitBounds([${bounds.join(',')}],{padding:[40,40],maxZoom:15});`;
  } else {
    viewSetup = '';
  }

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
html,body,#map{width:100%;height:100%;margin:0;padding:0;}
@keyframes pulse{0%{transform:scale(1);opacity:0.6}100%{transform:scale(3);opacity:0}}
.user-pulse{width:14px;height:14px;position:relative}
.user-pulse .dot{width:14px;height:14px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);position:absolute;z-index:2}
.user-pulse .ring{width:14px;height:14px;border-radius:50%;background:#4285F4;position:absolute;animation:pulse 2s ease-out infinite}
</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${center.latitude},${center.longitude}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
${userLoc ? `
var userIcon=L.divIcon({className:'',html:'<div class="user-pulse"><div class="ring"></div><div class="dot"></div></div>',iconSize:[14,14],iconAnchor:[7,7]});
L.marker([${userLoc.latitude},${userLoc.longitude}],{icon:userIcon,zIndexOffset:1000}).addTo(map).bindPopup('You are here');
` : ''}
${storeMarkers}
${viewSetup}
<\/script>
</body></html>`;
};

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
  const [mapExpanded, setMapExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [nearbyAlert, setNearbyAlert] = useState<Merchant | null>(null);
  const [radius, setRadius] = useState(getGeofenceRadius());
  const dismissedNearbyRef = useRef<Set<string>>(new Set());
  const nearbySlideAnim = useRef(new Animated.Value(-150)).current;

  const handleRadiusChange = (value: number) => {
    setRadius(value);
    setGeofenceRadius(value);
    // Re-check nearby stores with new radius
    if (userLocation) {
      dismissedNearbyRef.current.clear();
      setNearbyAlert(null);
      checkWithRadius(userLocation.latitude, userLocation.longitude, value);
    }
  };

  const checkWithRadius = (lat: number, lng: number, r: number) => {
    for (const m of merchants) {
      if (!m.latitude || !m.longitude || alertedStoresThisSession.has(m.id)) continue;
      const dist = getDistance(m);
      if (dist !== null && dist <= r) {
        alertedStoresThisSession.add(m.id);
        setNearbyAlert(m);
        break;
      }
    }
    checkNearbyStores(lat, lng).catch(() => {});
  };

  const loadedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!loadedOnce.current) {
        loadData();
      } else {
        // Silently refresh merchants only — no loader, no nearby re-check
        getAllMerchants().then(({ data }) => { if (data) setMerchants(data); });
      }
    }, [])
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
    loadedOnce.current = true;

    // Check for nearby stores using geofence radius — only alert once per store per session
    if (locationResult?.coords) {
      const loc = locationResult.coords;
      const currentRadius = getGeofenceRadius();
      for (const m of allMerchants) {
        if (!m.latitude || !m.longitude) continue;
        if (alertedStoresThisSession.has(m.id)) continue;
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(m.latitude - loc.latitude);
        const dLon = toRad(m.longitude - loc.longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(loc.latitude)) * Math.cos(toRad(m.latitude)) * Math.sin(dLon / 2) ** 2;
        const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        if (dist <= currentRadius) {
          alertedStoresThisSession.add(m.id);
          setNearbyAlert(m);
          break;
        }
      }
      // Also trigger push notifications for nearby stores
      checkNearbyStores(loc.latitude, loc.longitude).catch(() => {});
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
  const hasMap = !!WebView;

  const mapCenter = userLocation
    ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
    : merchantsOnMap.length > 0
      ? { latitude: merchantsOnMap[0].latitude!, longitude: merchantsOnMap[0].longitude! }
      : { latitude: 14.5995, longitude: 120.9842 };

  const mapStores = merchantsOnMap.map((m) => ({
    id: m.id,
    lat: m.latitude!,
    lng: m.longitude!,
    name: m.business_name,
    address: formatAddress(m),
    logoUrl: m.logo_url,
    dist: formatDist(getDistance(m)),
  }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

      {/* Geofence radius selector */}
      <View style={styles.radiusRow}>
        <View style={styles.radiusLabelRow}>
          <Ionicons name="navigate-circle" size={16} color="#2F4366" />
          <Text style={styles.radiusLabel}>Alert radius</Text>
        </View>
        <View style={styles.radiusChips}>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.radiusChip, radius === opt.value && styles.radiusChipActive]}
              onPress={() => handleRadiusChange(opt.value)}
            >
              <Text style={[styles.radiusChipText, radius === opt.value && styles.radiusChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
              <WebView
                key={`map-${merchantsOnMap.length}-${radius}`}
                source={{ html: buildLeafletHtml(mapCenter, mapStores, radius, userLocation) }}
                style={{ flex: 1 }}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                originWhitelist={['*']}
                nestedScrollEnabled={false}
              />
              <TouchableOpacity style={styles.mapExpandBtn} onPress={() => setMapExpanded(true)}>
                <Ionicons name="expand" size={16} color="#FFFFFF" />
              </TouchableOpacity>
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

      {/* Fullscreen map modal */}
      <Modal visible={mapExpanded} animationType="slide" onRequestClose={() => setMapExpanded(false)}>
        <View style={styles.fullscreenMap}>
          {WebView && (
            <WebView
              key={`fullmap-${merchantsOnMap.length}-${radius}`}
              source={{ html: buildLeafletHtml(mapCenter, mapStores, radius, userLocation) }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
            />
          )}
          {/* Radius chips overlay */}
          <View style={styles.fullscreenRadiusRow}>
            {RADIUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.fullscreenRadiusChip, radius === opt.value && styles.fullscreenRadiusChipActive]}
                onPress={() => handleRadiusChange(opt.value)}
              >
                <Text style={[styles.fullscreenRadiusText, radius === opt.value && styles.fullscreenRadiusTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Store count badge */}
          <View style={styles.fullscreenBadge}>
            <Ionicons name="storefront" size={14} color="#FFFFFF" />
            <Text style={styles.fullscreenBadgeText}>{merchantsOnMap.length} stores</Text>
          </View>
          {/* Close button */}
          <TouchableOpacity style={styles.fullscreenCloseBtn} onPress={() => setMapExpanded(false)}>
            <Ionicons name="contract" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>

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
  mapContainer: { marginHorizontal: 16, height: 440, borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#E8ECF1' },
  map: { flex: 1 },
  markerPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2F4366', borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  markerLogo: { width: 36, height: 36, borderRadius: 18 },

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
  fullscreenBadgeText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
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

  // Radius selector
  radiusRow: { paddingHorizontal: 24, marginBottom: 14 },
  radiusLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  radiusLabel: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  radiusChips: { flexDirection: 'row', gap: 8 },
  radiusChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E4EA' },
  radiusChipActive: { backgroundColor: '#2F4366', borderColor: '#2F4366' },
  radiusChipText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  radiusChipTextActive: { color: '#FFFFFF' },

  // Nearby alert
  nearbyBanner: { paddingHorizontal: 24, marginBottom: 12 },
  nearbyBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#27AE60', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  nearbyBannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  nearbyBannerTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  nearbyBannerText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
});
