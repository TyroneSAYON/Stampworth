import { useCallback, useState, useRef, useEffect } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { router, useFocusEffect } from 'expo-router';
import { getOrCreateCustomerProfile, getOrCreateCustomerQRCode, getCustomerAnnouncements, getCustomerLoyaltyCards } from '@/lib/database';
import { getCurrentUser } from '@/lib/auth';
import { setupPushNotifications } from '@/lib/notifications';
import { startGeofenceMonitoring } from '@/lib/geofence';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

type Announcement = { id: string; merchant_id: string; message: string; created_at: string; merchants: { business_name: string } | null };

export default function QRCodeScreen() {
  const [loading, setLoading] = useState(true);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [customerCode, setCustomerCode] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('Customer');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [selectedNotif, setSelectedNotif] = useState<Announcement | null>(null);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const loadedRef = useRef(false);

  // Persist read/deleted IDs
  useEffect(() => {
    AsyncStorage.getItem('stampworth_read_notifs').then((v) => { if (v) setReadIds(new Set(JSON.parse(v))); }).catch(() => {});
    AsyncStorage.getItem('stampworth_deleted_notifs').then((v) => { if (v) setDeletedIds(new Set(JSON.parse(v))); }).catch(() => {});
  }, []);
  useEffect(() => { if (readIds.size > 0) AsyncStorage.setItem('stampworth_read_notifs', JSON.stringify([...readIds])).catch(() => {}); }, [readIds]);
  useEffect(() => { if (deletedIds.size > 0) AsyncStorage.setItem('stampworth_deleted_notifs', JSON.stringify([...deletedIds])).catch(() => {}); }, [deletedIds]);

  useFocusEffect(
    useCallback(() => {
      // Already loaded — just refresh announcements silently
      if (loadedRef.current) {
        if (customerId) {
          getCustomerAnnouncements(customerId).then(({ data }) => setAnnouncements(data || []));
        }
        return;
      }

      let cancelled = false;
      const load = async () => {
        setLoading(true);
        const authUser = await getCurrentUser();
        if (!authUser) { setLoading(false); router.replace('/signin'); return; }

        const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Customer';
        if (!cancelled) setDisplayName(name as string);

        const { data: customer, error } = await getOrCreateCustomerProfile();
        if (cancelled) return;
        if (error || !customer) { Alert.alert('Unable to load profile', error?.message || 'Please sign in again.'); setLoading(false); return; }
        if (customer.full_name) setDisplayName(customer.full_name);

        const { data: qrData, error: qrError } = await getOrCreateCustomerQRCode(customer.id);
        if (cancelled) return;
        if (qrError || !qrData) { Alert.alert('QR Error', qrError?.message || 'Try again.'); setLoading(false); return; }

        const { data: annData } = await getCustomerAnnouncements(customer.id);
        if (!cancelled) setAnnouncements(annData || []);

        setupPushNotifications().catch(() => {});
        startGeofenceMonitoring().catch(() => {});

        if (!cancelled) {
          setQrValue(qrData.qr_code_value);
          setCustomerId(customer.id);
          setCustomerCode(customer.id.slice(0, 8).toUpperCase());
          setLoading(false);
          loadedRef.current = true;
        }
      };
      load();
      return () => { cancelled = true; };
    }, [customerId])
  );

  // Realtime: debounced alert when merchant stamps — one alert after batch completes
  const stampAlertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTxRef = useRef<{ merchantId: string; type: string }[]>([]);

  useEffect(() => {
    if (!customerId) return;

    const channel = supabase
      .channel('customer-scan-' + customerId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `customer_id=eq.${customerId}` },
        (payload) => {
          const tx = payload.new as any;
          if (!tx?.merchant_id) return;
          pendingTxRef.current.push({ merchantId: tx.merchant_id, type: tx.transaction_type });

          if (stampAlertTimer.current) clearTimeout(stampAlertTimer.current);
          stampAlertTimer.current = setTimeout(async () => {
            const pending = [...pendingTxRef.current];
            pendingTxRef.current = [];
            if (pending.length === 0) return;

            const lastMerchantId = pending[pending.length - 1].merchantId;

            // Retry fetching card data — it may take a moment to propagate
            let card: any = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              const { data: cards } = await getCustomerLoyaltyCards();
              card = (cards || []).find((c: any) => c.merchant_id === lastMerchantId);
              if (card) break;
              await new Promise((r) => setTimeout(r, 300));
            }
            if (!card) return;

            // Navigate directly to the stamps screen
            router.push({
              pathname: '/stamps',
              params: {
                loyaltyCardId: card.id,
                merchantId: card.merchant_id,
                merchant: card.merchants?.business_name || 'Store',
                collected: String(card.stamp_count || 0),
                total: String(card.stamp_settings?.stamps_per_redemption || 10),
                color: card.stamp_settings?.card_color || '#2F4366',
                iconName: card.stamp_settings?.stamp_icon_name || 'star',
                iconImageUrl: card.stamp_settings?.stamp_icon_image_url || '',
              },
            });
          }, 500);
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stamps', filter: `customer_id=eq.${customerId}` }, (payload) => {
        const stamp = payload.new as any;
        if (!stamp?.merchant_id) return;
        pendingTxRef.current.push({ merchantId: stamp.merchant_id, type: 'STAMP_EARNED' });
        if (stampAlertTimer.current) clearTimeout(stampAlertTimer.current);
        stampAlertTimer.current = setTimeout(async () => {
          const pending = [...pendingTxRef.current];
          pendingTxRef.current = [];
          if (pending.length === 0) return;
          const lastMerchantId = pending[pending.length - 1].merchantId;
          let card: any = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const { data: cards } = await getCustomerLoyaltyCards();
            card = (cards || []).find((c: any) => c.merchant_id === lastMerchantId);
            if (card) break;
            await new Promise((r) => setTimeout(r, 300));
          }
          if (!card) return;
          router.push({ pathname: '/stamps', params: { loyaltyCardId: card.id, merchantId: card.merchant_id, merchant: card.merchants?.business_name || 'Store', collected: String(card.stamp_count || 0), total: String(card.stamp_settings?.stamps_per_redemption || 10), color: card.stamp_settings?.card_color || '#2F4366', iconName: card.stamp_settings?.stamp_icon_name || 'star', iconImageUrl: card.stamp_settings?.stamp_icon_image_url || '' } });
        }, 500);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'merchant_announcements' }, () => {
        if (customerId) getCustomerAnnouncements(customerId).then(({ data }) => setAnnouncements(data || []));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dev_broadcasts' }, () => {
        if (customerId) getCustomerAnnouncements(customerId).then(({ data }) => setAnnouncements(data || []));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (stampAlertTimer.current) clearTimeout(stampAlertTimer.current);
    };
  }, [customerId]);

  const toggleDropdown = () => {
    if (dropdownOpen) {
      Animated.timing(dropdownAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setDropdownOpen(false));
    } else {
      setDropdownOpen(true);
      Animated.timing(dropdownAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  };

  const closeDropdown = () => {
    Animated.timing(dropdownAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setDropdownOpen(false));
  };

  const openNotif = (item: Announcement) => {
    setReadIds((prev) => new Set(prev).add(item.id));
    closeDropdown();
    setSelectedNotif(item);
  };

  const visibleAnnouncements = announcements.filter((a) => !deletedIds.has(a.id));
  const unreadCount = visibleAnnouncements.filter((a) => !readIds.has(a.id)).length;

  const markAllRead = () => setReadIds(new Set(visibleAnnouncements.map((a) => a.id)));
  const clearAllNotifs = () => {
    setDeletedIds(new Set(announcements.map((a) => a.id)));
    closeDropdown();
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(diff / 86400000);
    return `${days}d`;
  };

  const dropdownTranslateY = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });
  const dropdownOpacity = dropdownAnim;

  return (
    <View style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/stampworth-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth</Text>
        </View>
        <TouchableOpacity style={styles.bellButton} onPress={toggleDropdown}>
          <Ionicons name={dropdownOpen ? 'notifications' : 'notifications-outline'} size={20} color="#2F4366" />
          {unreadCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Dropdown */}
      {dropdownOpen && (
        <>
          <Pressable style={styles.overlay} onPress={closeDropdown} />
          <Animated.View style={[styles.dropdown, { opacity: dropdownOpacity, transform: [{ translateY: dropdownTranslateY }] }]}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Notifications</Text>
              {unreadCount > 0 && <Text style={styles.dropdownCount}>{unreadCount} new</Text>}
            </View>
            {visibleAnnouncements.length > 0 && (
              <View style={styles.dropdownActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity style={styles.dropdownActionBtn} onPress={markAllRead}>
                    <Ionicons name="checkmark-done" size={14} color="#2F4366" />
                    <Text style={styles.dropdownActionText}>Read all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.dropdownActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={clearAllNotifs}>
                  <Ionicons name="trash-outline" size={14} color="#E74C3C" />
                  <Text style={[styles.dropdownActionText, { color: '#E74C3C' }]}>Clear all</Text>
                </TouchableOpacity>
              </View>
            )}

            {visibleAnnouncements.length === 0 ? (
              <View style={styles.dropdownEmpty}>
                <Ionicons name="notifications-off-outline" size={24} color="#C4CAD4" />
                <Text style={styles.dropdownEmptyText}>No notifications</Text>
              </View>
            ) : (
              <FlatList
                data={visibleAnnouncements}
                keyExtractor={(item) => item.id}
                style={styles.dropdownList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isRead = readIds.has(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.notifItem, !isRead && styles.notifItemUnread]}
                      onPress={() => openNotif(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.notifDot, !isRead && styles.notifDotActive]} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.notifTop}>
                          <Text style={[styles.notifMerchant, !isRead && { color: '#1A1A2E' }]} numberOfLines={1}>
                            {item.merchants?.business_name || 'Store'}
                          </Text>
                          <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
                        </View>
                        <Text style={[styles.notifMsg, !isRead && { color: '#1A1A2E' }]} numberOfLines={2}>
                          {item.message}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </Animated.View>
        </>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.greeting}>Hi {displayName}!</Text>

        <View style={styles.qrCard}>
          {loading ? (
            <ActivityIndicator size="large" color="#2F4366" />
          ) : qrValue ? (
            <>
              <QRCode value={qrValue} size={260} backgroundColor="#FFFFFF" color="#2F4366" />
              <Text style={styles.qrId}>ID: {customerCode}</Text>
            </>
          ) : (
            <Ionicons name="alert-circle-outline" size={36} color="#C4CAD4" />
          )}
        </View>

        <Text style={styles.footerText}>Show this QR code to the counter</Text>
      </View>

      {/* Notification detail modal */}
      <Modal visible={!!selectedNotif} transparent animationType="fade" onRequestClose={() => setSelectedNotif(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedNotif(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedNotif && (
              <>
                {/* Accent bar */}
                <View style={styles.modalAccent} />
                <View style={styles.modalInner}>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalIconCircle}>
                      <Ionicons name={selectedNotif.merchant_id ? "megaphone" : "globe"} size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalMerchant}>{selectedNotif.merchants?.business_name || 'Stampworth'}</Text>
                      <View style={styles.modalMeta}>
                        <Ionicons name="time-outline" size={11} color="#8A94A6" />
                        <Text style={styles.modalTime}>{new Date(selectedNotif.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedNotif(null)}>
                      <Ionicons name="close" size={18} color="#8A94A6" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.modalDivider} />
                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalMessage}>{selectedNotif.message}</Text>
                  </ScrollView>
                  <TouchableOpacity style={styles.modalDismissBtn} onPress={() => setSelectedNotif(null)}>
                    <Text style={styles.modalDismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8, zIndex: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  bellButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E4EA' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', fontFamily: 'Poppins-SemiBold' },

  // Dropdown
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },
  dropdown: { position: 'absolute', top: 108, right: 16, width: SCREEN_W - 32, maxHeight: 380, backgroundColor: '#FFFFFF', borderRadius: 16, zIndex: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12, overflow: 'hidden' },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  dropdownTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  dropdownCount: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#2F4366', backgroundColor: '#EDF4FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  dropdownActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  dropdownActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F4FD', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  dropdownActionText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  dropdownEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  dropdownEmptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  dropdownList: { maxHeight: 320 },

  // Notification item
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F6F8FB' },
  notifItemUnread: { backgroundColor: '#F5F9FF' },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent', marginTop: 6 },
  notifDotActive: { backgroundColor: '#2F4366' },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  notifMerchant: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', flex: 1, marginRight: 8 },
  notifTime: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  notifMsg: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', lineHeight: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', maxHeight: '75%', backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  modalAccent: { height: 4, backgroundColor: '#2F4366' },
  modalInner: { padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2F4366', alignItems: 'center', justifyContent: 'center' },
  modalMerchant: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  modalMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  modalTime: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },
  modalDivider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 16 },
  modalBody: { maxHeight: 300 },
  modalMessage: { fontSize: 15, fontFamily: 'Poppins-Regular', color: '#3A3A4A', lineHeight: 24 },
  modalDismissBtn: { marginTop: 16, height: 44, borderRadius: 12, backgroundColor: '#F6F8FB', alignItems: 'center', justifyContent: 'center' },
  modalDismissText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },

  // Content
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  greeting: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', marginBottom: 36 },
  qrCard: { width: 320, paddingVertical: 30, backgroundColor: '#FFFFFF', borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 },
  qrId: { marginTop: 18, fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', letterSpacing: 2 },
  footerText: { marginTop: 32, fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
});
