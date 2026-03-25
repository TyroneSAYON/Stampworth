import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, useColorScheme, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, type IoniconsProps } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { signOut } from '@/lib/auth';
import { getMerchantDashboardSnapshot } from '@/lib/database';

export default function OptionsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('Your Business');
  const [cardColor, setCardColor] = useState('#2F4366');
  const [totalStamps, setTotalStamps] = useState(10);
  const [stampIconName, setStampIconName] = useState('star');
  const [stampIconImageUrl, setStampIconImageUrl] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [stampsIssued, setStampsIssued] = useState(0);
  const [rewardsRedeemed, setRewardsRedeemed] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadDashboard = async () => {
        setLoading(true);
        const { data, error } = await getMerchantDashboardSnapshot();

        if (cancelled) return;

        if (error || !data) {
          setLoading(false);
          if (error?.message === 'AUTH_SESSION_MISSING') {
            Alert.alert('Session expired', 'Please sign in again.');
            router.replace('/signin');
            return;
          }
          Alert.alert('Unable to load dashboard', error?.message || 'Please try again.');
          return;
        }

        setBusinessName(data.merchant.business_name || 'Your Business');
        setCardColor(data.settings?.card_color || '#2F4366');
        setTotalStamps(data.settings?.stamps_per_redemption || 10);
        setStampIconName(data.settings?.stamp_icon_name || 'star');
        setStampIconImageUrl(data.settings?.stamp_icon_image_url || null);
        setActiveUsers(data.stats.activeUsers);
        setStampsIssued(data.stats.stampsIssued);
        setRewardsRedeemed(data.stats.rewardsRedeemed);
        setLoading(false);
      };

      loadDashboard();

      return () => { cancelled = true; };
    }, [])
  );

  const collectedStamps = Math.min(3, totalStamps - 1);
  const stamps = Array.from({ length: totalStamps }, (_, i) => ({
    id: i,
    collected: i < collectedStamps,
    isFree: i === totalStamps - 1,
  }));

  const handleLogout = () => {
    Alert.alert('Log out', 'Do you want to log out of your business account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/signin');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading business data...</Text>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
            <Text style={styles.brandName}>Stampworth</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Manage your loyalty program</Text>

        {/* Card Preview */}
        <View style={[styles.cardPreview, { backgroundColor: cardColor }]}>
          <View style={styles.cardRow}>
            <View style={styles.cardLogoPlaceholder}>
              <Ionicons name="business" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardBusinessName} numberOfLines={1}>{businessName}</Text>
              <Text style={styles.cardSubtitle}>Loyalty Card</Text>
            </View>
            <Text style={styles.cardStampsValue}>{collectedStamps}/{totalStamps}</Text>
          </View>
          <View style={styles.stampGrid}>
            {stamps.map((stamp) => (
              <View
                key={stamp.id}
                style={[
                  styles.stampDot,
                  stamp.isFree
                    ? { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#FFFFFF', borderWidth: 2 }
                    : {
                        backgroundColor: stamp.collected ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                        borderColor: stamp.collected ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                      },
                ]}
              >
                {stamp.isFree
                  ? <Text style={{ fontSize: 7, fontFamily: 'Poppins-SemiBold', color: cardColor, textAlign: 'center' }}>FREE</Text>
                  : stamp.collected
                    ? stampIconImageUrl
                      ? <Image source={{ uri: stampIconImageUrl }} style={{ width: 18, height: 18 }} contentFit="contain" />
                      : <Ionicons name={stampIconName as any} size={16} color={cardColor} />
                    : null}
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#E8F4FD' }]}>
            <Ionicons name="people-outline" size={24} color="#2F4366" />
            <Text style={[styles.statNumber, { color: '#2F4366' }]}>{activeUsers}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E8F8EE' }]}>
            <Ionicons name="star-outline" size={24} color="#27AE60" />
            <Text style={[styles.statNumber, { color: '#27AE60' }]}>{stampsIssued}</Text>
            <Text style={styles.statLabel}>Stamps Issued</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF4E6' }]}>
            <Ionicons name="gift-outline" size={24} color="#E67E22" />
            <Text style={[styles.statNumber, { color: '#E67E22' }]}>{rewardsRedeemed}</Text>
            <Text style={styles.statLabel}>Redeemed</Text>
          </View>
        </View>

        {/* Configuration */}
        <Text style={styles.sectionTitle}>Configuration</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push({ pathname: '/storesetup', params: { mode: 'edit' } })}>
          <View style={[styles.menuIcon, { backgroundColor: '#E8F4FD' }]}>
            <Ionicons name="storefront-outline" size={20} color="#2F4366" />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Store Setup</Text>
            <Text style={styles.menuSubtitle}>Business profile & logo</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C4CAD4" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push({ pathname: '/loyaltysystem', params: { mode: 'edit' } })}>
          <View style={[styles.menuIcon, { backgroundColor: '#F3EEFF' }]}>
            <Ionicons name="card-outline" size={20} color="#673AB7" />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Loyalty System</Text>
            <Text style={styles.menuSubtitle}>Card style, stamps & rewards</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C4CAD4" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Poppins-Regular' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },

  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 20 },
  pageSubtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', paddingHorizontal: 24, marginTop: 4, marginBottom: 24 },

  // Card Preview
  cardPreview: { marginHorizontal: 24, borderRadius: 16, padding: 18, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  cardLogoPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  cardBusinessName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
  cardSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins-Regular' },
  cardStampsValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stampDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 28 },
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 6 },
  statNumber: { fontSize: 22, fontWeight: '700', fontFamily: 'Poppins-SemiBold' },
  statLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Section
  sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#2F4366', paddingHorizontal: 24, marginBottom: 14 },

  // Menu Items
  menuItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10, gap: 14 },
  menuIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  menuSubtitle: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 2 },

  // Logout
  logoutButton: { marginHorizontal: 24, marginTop: 20, backgroundColor: '#E74C3C', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  logoutText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
});
