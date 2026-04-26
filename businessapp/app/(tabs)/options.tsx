import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, TextInput, View, useColorScheme, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { signOut } from '@/lib/auth';
import { getMerchantDashboardSnapshot, getCachedDashboard, resetLoyaltyProgram, sendSupportMessage } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { getActivePlan, getSubscription, cancelSubscription, PLANS, type PlanId, type Plan } from '@/lib/subscription';

export default function OptionsScreen() {
  const [activePlan, setActivePlan] = useState<Plan>(PLANS.beta);
  const [subExpiry, setSubExpiry] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('Your Business');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cardColor, setCardColor] = useState('#2F4366');
  const [totalStamps, setTotalStamps] = useState(10);
  const [stampIconName, setStampIconName] = useState('star');
  const [stampIconImageUrl, setStampIconImageUrl] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [stampsIssued, setStampsIssued] = useState(0);
  const [rewardsRedeemed, setRewardsRedeemed] = useState(0);

  const [loadedOnce, setLoadedOnce] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Refresh subscription on every focus
      getActivePlan().then(setActivePlan);
      getSubscription().then((sub) => setSubExpiry(sub?.expiresAt || null));
      if (loadedOnce) return; // Don't re-fetch dashboard on every focus
      let cancelled = false;

      const loadDashboard = async () => {
        // Show cached data instantly
        const cached = await getCachedDashboard();
        if (cached) {
          setBusinessName(cached.merchant?.business_name || 'Your Business');
          setLogoUrl(cached.merchant?.logo_url || null);
          setCardColor(cached.settings?.card_color || '#2F4366');
          setTotalStamps(cached.settings?.stamps_per_redemption || 10);
          setStampIconName(cached.settings?.stamp_icon_name || 'star');
          setStampIconImageUrl(cached.settings?.stamp_icon_image_url || null);
          setActiveUsers(cached.stats?.activeUsers || 0);
          setStampsIssued(cached.stats?.stampsIssued || 0);
          setRewardsRedeemed(cached.stats?.rewardsRedeemed || 0);
          setLoading(false);
          setLoadedOnce(true);
        } else {
          setLoading(true);
        }
        // Fetch fresh in background
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
        setLogoUrl(data.merchant.logo_url || null);
        setCardColor(data.settings?.card_color || '#2F4366');
        setTotalStamps(data.settings?.stamps_per_redemption || 10);
        setStampIconName(data.settings?.stamp_icon_name || 'star');
        setStampIconImageUrl(data.settings?.stamp_icon_image_url || null);
        setActiveUsers(data.stats.activeUsers);
        setStampsIssued(data.stats.stampsIssued);
        setRewardsRedeemed(data.stats.rewardsRedeemed);
        setLoading(false);
        setLoadedOnce(true);
        // Load subscription
        getActivePlan().then(setActivePlan);
        getSubscription().then((sub) => setSubExpiry(sub?.expiresAt || null));
      };

      loadDashboard();

      return () => { cancelled = true; };
    }, [loadedOnce])
  );

  // Realtime: refresh stats when stamps/rewards change
  useEffect(() => {
    const channel = supabase
      .channel('options-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stamps' }, () => {
        getMerchantDashboardSnapshot().then(({ data }) => {
          if (data) { setActiveUsers(data.stats.activeUsers); setStampsIssued(data.stats.stampsIssued); setRewardsRedeemed(data.stats.rewardsRedeemed); }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'redeemed_rewards' }, () => {
        getMerchantDashboardSnapshot().then(({ data }) => {
          if (data) { setRewardsRedeemed(data.stats.rewardsRedeemed); }
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const collectedStamps = Math.min(3, totalStamps - 1);
  const stamps = Array.from({ length: totalStamps }, (_, i) => ({
    id: i,
    collected: i < collectedStamps,
    isFree: i === totalStamps - 1,
  }));

  const [resetting, setResetting] = useState(false);
  const [resetStep, setResetStep] = useState(0);

  const [contactOpen, setContactOpen] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleSendMessage = async () => {
    if (!contactMessage.trim()) { Alert.alert('Required', 'Please enter a message.'); return; }
    setSendingMessage(true);
    const { error } = await sendSupportMessage(contactSubject.trim(), contactMessage.trim());
    setSendingMessage(false);
    if (error) { Alert.alert('Failed', error.message); return; }
    setContactOpen(false);
    setContactSubject('');
    setContactMessage('');
    Alert.alert('Message Sent', 'Thanks for reaching out! The developers will get back to you soon.');
  };

  const handleReset = () => setResetStep(1);

  const doReset = async () => {
    setResetStep(0);
    setResetting(true);
    const { error } = await resetLoyaltyProgram();
    setResetting(false);
    if (error) {
      Alert.alert('Reset Failed', error.message);
      return;
    }
    setActiveUsers(0);
    setStampsIssued(0);
    setRewardsRedeemed(0);
    Alert.alert('Reset Complete', 'Your loyalty program has been reset. All stamps, cards, and rewards have been cleared.');
  };

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
            <Text style={styles.brandName}>Stampworth Business</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Manage your loyalty program</Text>

        {/* Card Preview */}
        <View style={[styles.cardPreview, { backgroundColor: cardColor }]}>
          <View style={styles.cardRow}>
            <View style={styles.cardLogoPlaceholder}>
              {logoUrl
                ? <Image source={{ uri: logoUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
                : <Ionicons name="business" size={20} color="#FFFFFF" />
              }
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

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setContactOpen(true)}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#FFF4E6' }]}>
            <Ionicons name="mail-outline" size={20} color="#E67E22" />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Contact Support</Text>
            <Text style={styles.menuSubtitle}>Reach out to the developers</Text>
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

        {/* Reset */}
        <TouchableOpacity
          activeOpacity={0.6}
          style={styles.resetButton}
          onPress={handleReset}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#FDE8E8' }]}>
            {resetting
              ? <ActivityIndicator size="small" color="#E74C3C" />
              : <Ionicons name="refresh-outline" size={20} color="#E74C3C" />
            }
          </View>
          <View style={styles.menuText}>
            <Text style={[styles.menuTitle, { color: '#E74C3C' }]}>{resetting ? 'Resetting...' : 'Reset Loyalty Program'}</Text>
            <Text style={styles.menuSubtitle}>Clear all stamps, cards & rewards</Text>
          </View>
          {!resetting && <Ionicons name="chevron-forward" size={18} color="#E74C3C" />}
        </TouchableOpacity>

        {/* Subscription Plans */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Subscription</Text>

        {/* Current Plan */}
        {(() => {
          const planColors: Record<string, string> = { beta: '#2F4366', starter: '#2F4366', growth: '#27AE60', scale: '#E67E22' };
          const pc = planColors[activePlan.id] || '#2F4366';
          return (
        <View style={[styles.betaCard, { borderColor: pc, borderWidth: 2 }]}>
          <View style={styles.betaCardHeader}>
            <View style={[styles.betaIconCircle, { backgroundColor: pc }]}>
              <Ionicons name={activePlan.id === 'beta' ? 'flask' : activePlan.id === 'starter' ? 'storefront' : activePlan.id === 'growth' ? 'trending-up' : 'flash'} size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.betaCardTitle}>{activePlan.name}</Text>
                <View style={[styles.activeBadge, { backgroundColor: pc + '15' }]}>
                  <View style={[styles.activeDot, { backgroundColor: pc }]} />
                  <Text style={[styles.activeBadgeText, { color: pc }]}>ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.betaCardDesc}>{activePlan.id === 'beta' ? 'All features unlocked during beta' : `₱${activePlan.price}/mo${subExpiry ? ` · Expires ${new Date(subExpiry).toLocaleDateString()}` : ''}`}</Text>
            </View>
            <Text style={[styles.betaFreeLabel, { color: pc }]}>{activePlan.id === 'beta' ? 'FREE' : `₱${activePlan.price}`}</Text>
          </View>
          <View style={styles.betaDivider} />
          <View style={styles.betaPerks}>
            <View style={styles.betaPerkItem}>
              <Ionicons name="people" size={15} color={pc} />
              <Text style={styles.betaPerkText}>{activePlan.cardHolderLimit === 0 ? 'Unlimited' : `Up to ${activePlan.cardHolderLimit}`} customers</Text>
            </View>
            <View style={styles.betaPerkItem}>
              <Ionicons name="qr-code" size={15} color={pc} />
              <Text style={styles.betaPerkText}>{activePlan.scanLimit === 0 ? 'Unlimited' : `${activePlan.scanLimit}/mo`} QR scans</Text>
            </View>
            <View style={styles.betaPerkItem}>
              <Ionicons name="megaphone" size={15} color={pc} />
              <Text style={styles.betaPerkText}>{activePlan.announcementLimit === 0 ? 'Unlimited' : `${activePlan.announcementLimit}/mo`} announcements</Text>
            </View>
            {activePlan.analytics && <View style={styles.betaPerkItem}><Ionicons name="analytics" size={15} color={pc} /><Text style={styles.betaPerkText}>Advanced analytics</Text></View>}
          </View>
          {/* Unsubscribe / Switch to Beta */}
          {activePlan.id !== 'beta' && (
            <TouchableOpacity
              style={styles.unsubscribeBtn}
              onPress={() => Alert.alert('Switch to Beta?', 'This will cancel your current plan and switch to Beta (Free) with all features unlocked.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Switch to Beta', onPress: async () => { await cancelSubscription(); setActivePlan(PLANS.beta); setSubExpiry(null); Alert.alert('Done', 'You are now on the Beta plan.'); } },
              ])}
            >
              <Ionicons name="swap-horizontal" size={14} color="#8A94A6" />
              <Text style={styles.unsubscribeText}>Switch to Beta (Free)</Text>
            </TouchableOpacity>
          )}
        </View>
          );
        })()}

        {/* Plans */}
        <Text style={styles.plansAfterLabel}>Subscription Plans</Text>

        {/* Starter */}
        <View style={[styles.planCard, activePlan.id === 'starter' && { borderColor: '#2F4366', borderWidth: 2 }]}>
          {activePlan.id === 'starter' && <View style={[styles.popularBanner, { backgroundColor: '#2F4366' }]}><Ionicons name="checkmark-circle" size={10} color="#FFFFFF" /><Text style={styles.popularBannerText}>YOUR PLAN</Text></View>}
          <View style={styles.planCardTop}>
            <View style={[styles.planIconCircle, { backgroundColor: '#E8F4FD' }]}>
              <Ionicons name="storefront-outline" size={20} color="#2F4366" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>Starter</Text>
              <Text style={styles.planTagline}>For sari-sari stores & small shops</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.planPrice, { color: '#2F4366' }]}>₱149</Text>
              <Text style={styles.planPeriod}>/month</Text>
            </View>
          </View>
          <View style={styles.planDivider} />
          <View style={styles.planFeatures}>
            <PlanFeature icon="people-outline" text="Up to 100 loyalty card holders" />
            <PlanFeature icon="qr-code-outline" text="500 QR stamp scans / month" />
            <PlanFeature icon="card-outline" text="1 loyalty card design" />
            <PlanFeature icon="bar-chart-outline" text="Basic stamp & redemption stats" />
            <PlanFeature icon="megaphone-outline" text="10 announcements / month" />
            <PlanFeature icon="mail-outline" text="Email support" />
          </View>
          <TouchableOpacity
            style={[styles.planButton, { backgroundColor: activePlan.id === 'starter' ? '#E0E4EA' : '#2F4366' }]}
            onPress={() => activePlan.id === 'starter' ? Alert.alert('Active', 'You are already on the Starter plan.') : router.push({ pathname: '/payment', params: { planId: 'starter' } })}
          >
            <Text style={[styles.planButtonText, activePlan.id === 'starter' && { color: '#2F4366' }]}>{activePlan.id === "starter" ? "✓ Current Plan" : "Subscribe"}</Text>
          </TouchableOpacity>
        </View>

        {/* Growth */}
        <View style={[styles.planCard, { borderColor: activePlan.id === 'growth' ? '#27AE60' : '#27AE60', borderWidth: 2 }]}>
          <View style={[styles.popularBanner, activePlan.id === 'growth' && { backgroundColor: '#27AE60' }]}>
            <Ionicons name={activePlan.id === 'growth' ? 'checkmark-circle' : 'star'} size={10} color="#FFFFFF" />
            <Text style={styles.popularBannerText}>{activePlan.id === 'growth' ? 'YOUR PLAN' : 'BEST VALUE'}</Text>
          </View>
          <View style={styles.planCardTop}>
            <View style={[styles.planIconCircle, { backgroundColor: '#E8F8EE' }]}>
              <Ionicons name="trending-up-outline" size={20} color="#27AE60" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>Growth</Text>
              <Text style={styles.planTagline}>For cafés, restaurants & growing SMEs</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.planPrice, { color: '#27AE60' }]}>₱349</Text>
              <Text style={styles.planPeriod}>/month</Text>
            </View>
          </View>
          <View style={styles.planDivider} />
          <View style={styles.planFeatures}>
            <PlanFeature icon="people-outline" text="Up to 1,000 loyalty card holders" color="#27AE60" />
            <PlanFeature icon="qr-code-outline" text="Unlimited QR stamp scans" color="#27AE60" />
            <PlanFeature icon="color-palette-outline" text="Custom card colors & designs" color="#27AE60" />
            <PlanFeature icon="image-outline" text="Custom stamp icons (upload your own)" color="#27AE60" />
            <PlanFeature icon="analytics-outline" text="Advanced analytics & customer insights" color="#27AE60" />
            <PlanFeature icon="megaphone-outline" text="Unlimited announcements" color="#27AE60" />
            <PlanFeature icon="location-outline" text="Store map listing + nearby customers" color="#27AE60" />
            <PlanFeature icon="chatbubbles-outline" text="Priority support" color="#27AE60" />
          </View>
          <TouchableOpacity
            style={[styles.planButton, { backgroundColor: activePlan.id === 'growth' ? '#D4EDDA' : '#27AE60' }]}
            onPress={() => activePlan.id === 'growth' ? Alert.alert('Active', 'You are already on the Growth plan.') : router.push({ pathname: '/payment', params: { planId: 'growth' } })}
          >
            <Text style={[styles.planButtonText, activePlan.id === 'growth' && { color: '#27AE60' }]}>{activePlan.id === "growth" ? "✓ Current Plan" : "Subscribe"}</Text>
          </TouchableOpacity>
        </View>

        {/* Scale */}
        <View style={[styles.planCard, activePlan.id === 'scale' && { borderColor: '#E67E22', borderWidth: 2 }]}>
          {activePlan.id === 'scale' && <View style={[styles.popularBanner, { backgroundColor: '#E67E22' }]}><Ionicons name="checkmark-circle" size={10} color="#FFFFFF" /><Text style={styles.popularBannerText}>YOUR PLAN</Text></View>}
          <View style={styles.planCardTop}>
            <View style={[styles.planIconCircle, { backgroundColor: '#FFF4E6' }]}>
              <Ionicons name="flash-outline" size={20} color="#E67E22" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>Scale</Text>
              <Text style={styles.planTagline}>For franchises & multi-branch businesses</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.planPrice, { color: '#E67E22' }]}>₱799</Text>
              <Text style={styles.planPeriod}>/month</Text>
            </View>
          </View>
          <View style={styles.planDivider} />
          <View style={styles.planFeatures}>
            <PlanFeature icon="people-outline" text="Unlimited loyalty card holders" color="#E67E22" />
            <PlanFeature icon="qr-code-outline" text="Unlimited QR stamp scans" color="#E67E22" />
            <PlanFeature icon="color-palette-outline" text="Full branding customization" color="#E67E22" />
            <PlanFeature icon="image-outline" text="Custom stamp icons + animated stamps" color="#E67E22" />
            <PlanFeature icon="analytics-outline" text="Full analytics suite + export reports" color="#E67E22" />
            <PlanFeature icon="megaphone-outline" text="Unlimited announcements + push notifications" color="#E67E22" />
            <PlanFeature icon="map-outline" text="Multi-branch store management" color="#E67E22" />
            <PlanFeature icon="code-slash-outline" text="API access for POS integration" color="#E67E22" />
            <PlanFeature icon="headset-outline" text="Dedicated account manager" color="#E67E22" />
          </View>
          <TouchableOpacity
            style={[styles.planButton, { backgroundColor: activePlan.id === 'scale' ? '#FDEBD0' : '#E67E22' }]}
            onPress={() => activePlan.id === 'scale' ? Alert.alert('Active', 'You are already on the Scale plan.') : router.push({ pathname: '/payment', params: { planId: 'scale' } })}
          >
            <Text style={[styles.planButtonText, activePlan.id === 'scale' && { color: '#E67E22' }]}>{activePlan.id === "scale" ? "✓ Current Plan" : "Subscribe"}</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Contact Support Modal */}
      <Modal visible={contactOpen} transparent animationType="slide" onRequestClose={() => setContactOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.contactOverlay} onPress={() => setContactOpen(false)}>
            <Pressable style={styles.contactCard} onPress={() => {}}>
              <View style={styles.contactHeader}>
                <View>
                  <Text style={styles.contactTitle}>Contact Support</Text>
                  <Text style={styles.contactSub}>The developers will get back to you</Text>
                </View>
                <TouchableOpacity onPress={() => setContactOpen(false)}>
                  <Ionicons name="close" size={22} color="#8A94A6" />
                </TouchableOpacity>
              </View>

              <Text style={styles.contactLabel}>Subject (optional)</Text>
              <TextInput
                value={contactSubject}
                onChangeText={setContactSubject}
                placeholder="What is this about?"
                placeholderTextColor="#C4CAD4"
                style={styles.contactInput}
              />

              <Text style={styles.contactLabel}>Message</Text>
              <TextInput
                value={contactMessage}
                onChangeText={setContactMessage}
                placeholder="Describe your issue or feedback..."
                placeholderTextColor="#C4CAD4"
                multiline
                numberOfLines={6}
                style={[styles.contactInput, styles.contactTextarea]}
                textAlignVertical="top"
              />

              <TouchableOpacity style={[styles.contactSendBtn, sendingMessage && { opacity: 0.6 }]} onPress={handleSendMessage} disabled={sendingMessage}>
                {sendingMessage ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.contactSendText}>Send Message</Text>}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reset Step 1 */}
      {resetStep === 1 && (
        <View style={styles.resetOverlay}>
          <View style={styles.resetModal}>
            <View style={styles.resetModalIcon}>
              <Ionicons name="warning" size={32} color="#E74C3C" />
            </View>
            <Text style={styles.resetModalTitle}>Reset Loyalty Program</Text>
            <Text style={styles.resetModalText}>
              This will permanently delete:{'\n\n'}
              • All issued stamps{'\n'}
              • All customer loyalty cards{'\n'}
              • All redeemed rewards{'\n'}
              • All transaction history{'\n\n'}
              Your customers will lose their progress.
            </Text>
            <TouchableOpacity style={styles.resetModalBtnDanger} onPress={() => setResetStep(2)}>
              <Text style={styles.resetModalBtnDangerText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetModalBtnCancel} onPress={() => setResetStep(0)}>
              <Text style={styles.resetModalBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reset Step 2 */}
      {resetStep === 2 && (
        <View style={styles.resetOverlay}>
          <View style={styles.resetModal}>
            <View style={styles.resetModalIcon}>
              <Ionicons name="alert-circle" size={32} color="#E74C3C" />
            </View>
            <Text style={styles.resetModalTitle}>Are you sure?</Text>
            <Text style={styles.resetModalText}>
              This action cannot be undone. All data will be permanently erased.
            </Text>
            <TouchableOpacity style={styles.resetModalBtnDanger} onPress={() => setResetStep(3)}>
              <Text style={styles.resetModalBtnDangerText}>Reset Everything</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetModalBtnCancel} onPress={() => setResetStep(0)}>
              <Text style={styles.resetModalBtnCancelText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reset Step 3 - Final */}
      {resetStep === 3 && (
        <View style={styles.resetOverlay}>
          <View style={styles.resetModal}>
            <View style={styles.resetModalIcon}>
              <Ionicons name="trash" size={32} color="#E74C3C" />
            </View>
            <Text style={styles.resetModalTitle}>Final Confirmation</Text>
            <Text style={styles.resetModalText}>
              Proceed with resetting your loyalty program?
            </Text>
            <TouchableOpacity style={styles.resetModalBtnDanger} onPress={doReset}>
              <Text style={styles.resetModalBtnDangerText}>Yes, Proceed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetModalBtnCancel} onPress={() => setResetStep(0)}>
              <Text style={styles.resetModalBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

function PlanFeature({ icon, text, color = '#2F4366' }: { icon: string; text: string; color?: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon as any} size={15} color={color} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
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

  // Beta Card
  betaCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: '#2F4366', shadowColor: '#2F4366', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  betaCardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  betaIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2F4366', alignItems: 'center' as const, justifyContent: 'center' as const },
  betaCardTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  betaCardDesc: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },
  betaFreeLabel: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  activeBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#E8F8EE', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27AE60' },
  activeBadgeText: { fontSize: 9, fontFamily: 'Poppins-SemiBold', color: '#27AE60', letterSpacing: 0.5 },
  betaDivider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 14 },
  betaPerks: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  betaPerkItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: '#F6F8FB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: '48%' as any },
  betaPerkText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#4A5568', flexShrink: 1 },
  unsubscribeBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, marginTop: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F6F8FB', borderWidth: 1, borderColor: '#E0E4EA' },
  unsubscribeText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },

  // Plans After Beta
  plansAfterLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#B0B8C4', textTransform: 'uppercase' as const, letterSpacing: 1, paddingHorizontal: 24, marginBottom: 12 },

  // Plan Cards
  planCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#E0E4EA', overflow: 'hidden' as const },
  planCardTop: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  planIconCircle: { width: 42, height: 42, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
  planName: { fontSize: 17, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  planTagline: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },
  planPrice: { fontSize: 22, fontFamily: 'Poppins-SemiBold' },
  planPeriod: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  planDivider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 14 },
  planFeatures: { gap: 10, marginBottom: 16 },
  featureRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  featureText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#4A5568', flex: 1 },
  planButton: { borderRadius: 12, height: 46, alignItems: 'center' as const, justifyContent: 'center' as const },
  planButtonText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  popularBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 4, backgroundColor: '#27AE60', paddingVertical: 5, marginHorizontal: -18, marginTop: -18, marginBottom: 14 },
  popularBannerText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF', letterSpacing: 1 },

  // Reset
  resetButton: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10, marginTop: 10, gap: 14, borderWidth: 1.5, borderColor: '#F5C6C6' },
  resetOverlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, alignItems: 'center' as const, zIndex: 100, paddingHorizontal: 24 },
  resetModal: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center' as const },
  resetModalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FDE8E8', alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16 },
  resetModalTitle: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', marginBottom: 12 },
  resetModalText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center' as const, lineHeight: 20, marginBottom: 24 },
  resetModalBtnDanger: { width: '100%', height: 48, backgroundColor: '#E74C3C', borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 10 },
  resetModalBtnDangerText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
  resetModalBtnCancel: { width: '100%', height: 48, alignItems: 'center' as const, justifyContent: 'center' as const },
  resetModalBtnCancelText: { color: '#8A94A6', fontSize: 14, fontFamily: 'Poppins-Regular' },

  // Logout
  logoutButton: { marginHorizontal: 24, marginTop: 20, backgroundColor: '#E74C3C', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  logoutText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },

  // Contact Modal
  contactOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  contactCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  contactHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 20 },
  contactTitle: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  contactSub: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 2 },
  contactLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', textTransform: 'uppercase' as const, marginBottom: 6, marginTop: 4 },
  contactInput: { backgroundColor: '#F6F8FB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', marginBottom: 14, borderWidth: 1, borderColor: '#E0E4EA' },
  contactTextarea: { minHeight: 120, paddingTop: 12 },
  contactSendBtn: { backgroundColor: '#2F4366', borderRadius: 12, height: 50, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 8 },
  contactSendText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
});
