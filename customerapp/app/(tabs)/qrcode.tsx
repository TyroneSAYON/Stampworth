import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { router, useFocusEffect } from 'expo-router';

import { getCustomerAnnouncements, getOrCreateCustomerProfile, getOrCreateCustomerQRCode } from '@/lib/database';
import { getCurrentUser } from '@/lib/auth';

export default function QRCodeScreen() {
  const [loading, setLoading] = useState(true);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [customerCode, setCustomerCode] = useState('');
  const [displayName, setDisplayName] = useState('Customer');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
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
        if (!cancelled) {
          setAnnouncements(annData || []);
          setQrValue(qrData.qr_code_value);
          setCustomerCode(customer.id.slice(0, 8).toUpperCase());
          setLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/stampworth-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth</Text>
        </View>
        <TouchableOpacity style={styles.bellButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="notifications-outline" size={20} color="#2F4366" />
          {announcements.length > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{announcements.length > 9 ? '9+' : String(announcements.length)}</Text></View>
          )}
        </TouchableOpacity>
      </View>

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

      {/* Announcements Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Announcements</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#8A94A6" /></TouchableOpacity>
            </View>
            {announcements.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={28} color="#C4CAD4" />
                <Text style={styles.emptyText}>No announcements</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.annList}>
                {announcements.map((item, i) => (
                  <View key={item.id || String(i)} style={styles.annCard}>
                    <Text style={styles.annMerchant}>{item?.merchants?.business_name || 'Store'}</Text>
                    <Text style={styles.annMessage}>{item.message}</Text>
                    {item.created_at && <Text style={styles.annDate}>{new Date(item.created_at).toLocaleDateString()}</Text>}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  bellButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E4EA' },
  badge: { position: 'absolute', top: -4, right: -3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700', fontFamily: 'Poppins-SemiBold' },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  greeting: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', marginBottom: 36 },
  qrCard: { width: 320, paddingVertical: 30, backgroundColor: '#FFFFFF', borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 },
  qrId: { marginTop: 18, fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', letterSpacing: 2 },
  footerText: { marginTop: 32, fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  emptyState: { paddingVertical: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  annList: { gap: 10, paddingBottom: 16 },
  annCard: { backgroundColor: '#F6F8FB', borderRadius: 12, padding: 14 },
  annMerchant: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#2F4366', marginBottom: 4 },
  annMessage: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#1A1A2E', lineHeight: 18 },
  annDate: { marginTop: 6, fontSize: 11, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
});
