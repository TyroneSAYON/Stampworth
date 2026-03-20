import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { getCustomerAnnouncements, getOrCreateCustomerProfile, getOrCreateCustomerQRCode } from '@/lib/database';
import { getCurrentUser } from '@/lib/auth';

export default function QRCodeScreen() {
  const [loading, setLoading] = useState(true);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [customerCode, setCustomerCode] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('Customer');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);

  const loadCustomerQRCode = async () => {
    setLoading(true);

    const authUser = await getCurrentUser();
    if (!authUser) {
      setLoading(false);
      setQrValue(null);
      Alert.alert('Not signed in', 'Please sign in to view your QR code.');
      router.replace('/signin');
      return;
    }

    const metadataName =
      (authUser.user_metadata?.full_name as string | undefined) ||
      (authUser.user_metadata?.name as string | undefined) ||
      (authUser.user_metadata?.preferred_username as string | undefined);

    const emailName = authUser.email?.split('@')[0];
    setDisplayName(metadataName || emailName || 'Customer');

    const { data: customer, error: customerError } = await getOrCreateCustomerProfile();
    if (customerError || !customer) {
      Alert.alert('Unable to load profile', customerError?.message || 'Please sign in again.');
      setLoading(false);
      return;
    }

    if (customer.full_name) {
      setDisplayName(customer.full_name);
    }

    const { data: qrData, error: qrError } = await getOrCreateCustomerQRCode(customer.id);
    if (qrError || !qrData) {
      Alert.alert('Unable to generate QR', qrError?.message || 'Please try again.');
      setLoading(false);
      return;
    }

    const { data: announcementData } = await getCustomerAnnouncements(customer.id);
    setAnnouncements(announcementData || []);

    setQrValue(qrData.qr_code_value);
    setCustomerCode(customer.id.slice(0, 8).toUpperCase());
    setLoading(false);
  };

  const showAnnouncements = () => setAnnouncementModalVisible(true);

  useEffect(() => {
    loadCustomerQRCode();
  }, []);

  return (
    <ThemedView style={styles.container}>
      {/* Header with Logo and Brand Name */}
      <View style={styles.header}>
        <View style={styles.brandWrap}>
          <Image
            source={require('@/assets/images/stampworth-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.brandName}>Stampworth</Text>
        </View>

        <TouchableOpacity style={styles.bellButton} onPress={showAnnouncements}>
          <Ionicons name="notifications-outline" size={24} color="#2F4366" />
          {announcements.length > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{announcements.length > 9 ? '9+' : String(announcements.length)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Greeting */}
        <Text style={styles.greeting}>Hi {displayName}!</Text>

        {/* QR Code Container */}
        <View style={styles.qrCodeContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#2F4366" />
          ) : qrValue ? (
            <View style={styles.qrPlaceholder}>
              <QRCode value={qrValue} size={210} backgroundColor="#FFFFFF" color="#2F4366" />
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="alert-circle-outline" size={36} color="#5F6368" />
            </View>
          )}
        </View>

        {/* QR Code ID */}
        <Text style={styles.qrCodeId}>ID: {customerCode || 'UNKNOWN'}</Text>

      </View>

      {/* Footer Text */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Show this QR Code to the counter</Text>
      </View>

      <Modal
        visible={announcementModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnnouncementModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Announcements</Text>
              <TouchableOpacity onPress={() => setAnnouncementModalVisible(false)}>
                <Ionicons name="close" size={22} color="#2F4366" />
              </TouchableOpacity>
            </View>

            {announcements.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={28} color="#5F6368" />
                <Text style={styles.emptyStateText}>No announcements right now.</Text>
              </View>
            ) : (
              <ScrollView style={styles.announcementList} contentContainerStyle={styles.announcementListContent}>
                {announcements.map((item, index) => {
                  const merchantName = item?.merchants?.business_name || 'Store';
                  const createdAt = item?.created_at ? new Date(item.created_at).toLocaleDateString() : '';

                  return (
                    <View key={item.id || String(index)} style={styles.announcementItem}>
                      <Text style={styles.announcementMerchant}>{merchantName}</Text>
                      <Text style={styles.announcementMessage}>{item.message}</Text>
                      {createdAt ? <Text style={styles.announcementDate}>{createdAt}</Text> : null}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 10,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2F4366',
    letterSpacing: 0.5,
    fontFamily: 'Poppins-SemiBold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FA',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Poppins-SemiBold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F4366',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  qrCodeContainer: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrPlaceholder: {
    width: 230,
    height: 230,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeId: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5F6368',
    marginTop: 10,
    letterSpacing: 1,
    fontFamily: 'Poppins-Regular',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding to account for tab bar
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#5F6368',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    color: '#2F4366',
    fontFamily: 'Poppins-SemiBold',
  },
  announcementList: {
    flexGrow: 0,
  },
  announcementListContent: {
    gap: 10,
  },
  announcementItem: {
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F4F7FC',
  },
  announcementMerchant: {
    fontSize: 14,
    color: '#2F4366',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  announcementMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: '#28323F',
    fontFamily: 'Poppins-Regular',
  },
  announcementDate: {
    marginTop: 6,
    fontSize: 11,
    color: '#5F6368',
    fontFamily: 'Poppins-Regular',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#5F6368',
    fontFamily: 'Poppins-Regular',
  },
});