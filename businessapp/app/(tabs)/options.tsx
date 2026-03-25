import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, useColorScheme, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
  const [activeUsers, setActiveUsers] = useState(0);
  const [stampsIssued, setStampsIssued] = useState(0);
  const [rewardsRedeemed, setRewardsRedeemed] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      const { data, error } = await getMerchantDashboardSnapshot();

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
      setActiveUsers(data.stats.activeUsers);
      setStampsIssued(data.stats.stampsIssued);
      setRewardsRedeemed(data.stats.rewardsRedeemed);
      setLoading(false);
    };

    loadDashboard();
  }, []);

  const collectedStamps = Math.min(3, totalStamps);

  const stamps = Array.from({ length: totalStamps }, (_, i) => ({
    id: i,
    collected: i < collectedStamps,
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

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading business data...</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('@/assets/images/stampworthb-logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.brandName}>Stampworth Business</Text>
          </View>
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: '#2F4366' }]}>Options</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Manage your loyalty program settings
          </Text>
        </View>

        {/* Card Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Loyalty Card Preview</Text>
          <View style={[styles.cardPreview, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLogoPlaceholder}>
                <Ionicons name="business" size={24} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.cardBusinessName}>{businessName}</Text>
                <Text style={styles.cardSubtitle}>Loyalty Card</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardFooter}>
              <Text style={styles.cardStampsLabel}>Stamps</Text>
              <Text style={styles.cardStampsValue}>
                {collectedStamps} / {totalStamps}
              </Text>
            </View>
            <View style={styles.stampGrid}>
              {stamps.map((stamp) => (
                <View
                  key={stamp.id}
                  style={[
                    styles.stampPreview,
                    {
                      backgroundColor: stamp.collected ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      borderColor: stamp.collected ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                    },
                  ]}
                >
                  {stamp.collected && <Ionicons name="star" size={20} color={cardColor} />}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Configuration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Configuration</Text>
          <TouchableOpacity
            style={[styles.configButton, { backgroundColor: '#F5F5F5' }]}
            onPress={() => router.push('/storesetup')}
          >
            <Ionicons name="storefront-outline" size={24} color="#2F4366" />
            <View style={styles.configButtonText}>
              <Text style={[styles.configButtonTitle, { color: theme.text }]}>Store Setup</Text>
              <Text style={[styles.configButtonSubtitle, { color: theme.icon }]}>
                Manage business profile
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.configButton, { backgroundColor: '#F5F5F5' }]}
            onPress={() => router.push('/loyaltysystem')}
          >
            <Ionicons name="card-outline" size={24} color="#2F4366" />
            <View style={styles.configButtonText}>
              <Text style={[styles.configButtonTitle, { color: theme.text }]}>Loyalty System</Text>
              <Text style={[styles.configButtonSubtitle, { color: theme.icon }]}>
                Configure stamp program
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.configButton, { backgroundColor: '#F5F5F5' }]}
            onPress={() => router.push('/stampsetup')}
          >
            <Ionicons name="pricetag-outline" size={24} color="#2F4366" />
            <View style={styles.configButtonText}>
              <Text style={[styles.configButtonTitle, { color: theme.text }]}>Stamp Setup</Text>
              <Text style={[styles.configButtonSubtitle, { color: theme.icon }]}>
                Manage stamp rules
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.icon} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* Statistics & Analytics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Statistics & Analytics</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="people-outline" size={32} color="#2F4366" />
              <Text style={[styles.statValue, { color: '#2F4366' }]}>{activeUsers}</Text>
              <Text style={[styles.statLabel, { color: theme.icon }]}>Active Users</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="star-outline" size={32} color="#27AE60" />
              <Text style={[styles.statValue, { color: '#27AE60' }]}>{stampsIssued}</Text>
              <Text style={[styles.statLabel, { color: theme.icon }]}>Stamps Issued</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="gift-outline" size={32} color="#E67E22" />
              <Text style={[styles.statValue, { color: '#E67E22' }]}>{rewardsRedeemed}</Text>
              <Text style={[styles.statLabel, { color: theme.icon }]}>Rewards Redeemed</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 40,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 10,
    marginBottom: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  profileButton: {
    marginLeft: 16,
  },
  profileLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2F4366',
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F4366',
    marginBottom: 8,
    textAlign: 'left',
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
  },
  // Card Preview Styles
  cardPreview: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBusinessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins-Regular',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardStampsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins-Regular',
  },
  cardStampsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  stampGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stampPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Configuration Styles
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  configButtonText: {
    flex: 1,
  },
  configButtonTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  configButtonSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  // Statistics Styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins-SemiBold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  logoutButton: {
    marginBottom: 24,
    backgroundColor: '#B33434',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
});

