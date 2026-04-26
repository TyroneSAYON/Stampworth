import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getCustomerLoyaltyCards, getOrCreateCustomerProfile } from '@/lib/database';
import { getCache, setCache } from '@/lib/cache';
import { supabase } from '@/lib/supabase';

export default function CardsScreen() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);
  const customerIdRef = useRef<string | null>(null);
  const loadedOnce = useRef(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCards = async (showLoader = false) => {
    if (showLoader) {
      // Show cached cards instantly
      const cached = await getCache('customer_cards');
      if (cached) { setCards(cached); setLoading(false); }
      else setLoading(true);
    }
    const { data, error } = await getCustomerLoyaltyCards();
    if (error) console.warn('Cards load error:', error.message);
    setCards(data || []);
    if (data) setCache('customer_cards', data, 2 * 60 * 1000);
    setLoading(false);
    loadedOnce.current = true;
  };

  // First load + reload on focus only if already loaded once (fast, no loader)
  useFocusEffect(
    useCallback(() => {
      if (!loadedOnce.current) {
        loadCards(true);
      } else {
        loadCards(false);
      }
    }, [])
  );

  // Realtime: single debounced reload — prevents multiple refreshes
  useEffect(() => {
    let channel: any = null;
    const debouncedReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => loadCards(false), 2500);
    };
    const setup = async () => {
      const { data: customer } = await getOrCreateCustomerProfile();
      if (!customer) return;
      customerIdRef.current = customer.id;
      channel = supabase
        .channel('cards-rt-' + customer.id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `customer_id=eq.${customer.id}` }, debouncedReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stamp_settings' }, debouncedReload)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchants' }, debouncedReload)
        .subscribe();
    };
    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/stampworth-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth</Text>
        </View>
      </View>

      <Text style={styles.pageTitle}>My Cards</Text>
      <Text style={styles.pageSubtitle}>Your loyalty card collection</Text>

      {/* Free redemption banner */}
      {!loading && (() => {
        const freeCards = cards.filter((c) => {
          if (c.has_pending_reward) return true;
          const t = c.stamp_settings?.stamps_per_redemption || 10;
          return c.is_free_redemption || (c.stamp_count || 0) >= t - 1;
        });
        if (freeCards.length === 0) return null;
        return (
          <TouchableOpacity
            style={styles.redeemBanner}
            onPress={() => {
              const card = freeCards[0];
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
            }}
          >
            <View style={styles.redeemBannerIcon}>
              <Ionicons name="gift" size={22} color="#E67E22" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.redeemBannerTitle}>
                {freeCards.length === 1
                  ? 'You have a free reward!'
                  : `You have ${freeCards.length} free rewards!`}
              </Text>
              <Text style={styles.redeemBannerSub}>
                {freeCards.map((c) => c.merchants?.business_name || 'Store').join(', ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#E67E22" />
          </TouchableOpacity>
        );
      })()}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /></View>
      ) : cards.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="card-outline" size={48} color="#C4CAD4" />
          <Text style={styles.emptyText}>No loyalty cards yet</Text>
          <Text style={styles.emptySubtext}>Visit a store and scan your QR code to get started</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {cards.map((card) => {
            const merchantName = card.merchants?.business_name || 'Store';
            const color = card.stamp_settings?.card_color || '#2F4366';
            const total = card.stamp_settings?.stamps_per_redemption || 10;
            const iconName = card.stamp_settings?.stamp_icon_name || 'star';
            const iconImageUrl = card.stamp_settings?.stamp_icon_image_url || null;
            const rewardDesc = card.stamp_settings?.redemption_reward_description || null;
            const collected = card.stamp_count || 0;
            const collectableSlots = total - 1;
            const pct = collectableSlots > 0 ? Math.min(100, (collected / collectableSlots) * 100) : 0;
            const hasPendingReward = card.has_pending_reward || false;
            const hasFreeReward = !hasPendingReward && (card.is_free_redemption || collected >= collectableSlots);

            return (
              <TouchableOpacity
                key={card.id}
                style={[styles.card, { backgroundColor: color }]}
                onPress={() => router.push({
                  pathname: '/stamps',
                  params: {
                    loyaltyCardId: card.id,
                    merchantId: card.merchant_id,
                    merchant: merchantName,
                    collected: String(collected),
                    total: String(total),
                    color,
                    iconName,
                    iconImageUrl: iconImageUrl || '',
                  },
                })}
              >
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    {card.merchants?.logo_url
                      ? <Image source={{ uri: card.merchants.logo_url }} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" />
                      : <Ionicons name="business" size={16} color="#FFFFFF" />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMerchant} numberOfLines={1}>{merchantName}</Text>
                    <Text style={styles.cardSub}>Loyalty Card</Text>
                  </View>
                  <Text style={styles.cardStamps}>{collected}/{collectableSlots}</Text>
                </View>

                {/* Mini stamp preview */}
                <View style={styles.miniGrid}>
                  {Array.from({ length: total }, (_, i) => {
                    const isFree = i === total - 1;
                    const isFilled = !isFree && i < collected;
                    return (
                      <View key={i} style={[
                        styles.miniCircle,
                        isFree ? { backgroundColor: 'rgba(255,255,255,0.85)' }
                          : isFilled ? { backgroundColor: '#FFFFFF' }
                          : { backgroundColor: 'rgba(255,255,255,0.2)' },
                      ]}>
                        {isFree ? (
                          iconImageUrl ? (
                            <Image source={{ uri: iconImageUrl }} style={{ width: 8, height: 8 }} contentFit="contain" tintColor="#E67E22" />
                          ) : (
                            <Ionicons name={iconName as any} size={8} color="#E67E22" />
                          )
                        ) : isFilled ? (
                          iconImageUrl ? (
                            <Image source={{ uri: iconImageUrl }} style={{ width: 8, height: 8 }} contentFit="contain" />
                          ) : (
                            <Ionicons name={iconName as any} size={8} color={color} />
                          )
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>

                {/* Reward description */}
                {rewardDesc && (
                  <View style={styles.rewardRow}>
                    <Ionicons name="gift-outline" size={14} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.rewardDesc} numberOfLines={1}>Reward: {rewardDesc}</Text>
                  </View>
                )}

                {hasPendingReward && (
                  <View style={styles.pendingRewardBadge}>
                    <Ionicons name="gift" size={14} color="#FFFFFF" />
                    <Text style={styles.pendingRewardText}>🎉 You have a reward to claim!</Text>
                  </View>
                )}
                {hasFreeReward && !hasPendingReward && (
                  <View style={styles.freeBadge}>
                    <Ionicons name="gift" size={14} color="#E67E22" />
                    <Text style={styles.freeText}>FREE REWARD READY</Text>
                    <Ionicons name="chevron-forward" size={12} color="#E67E22" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 20 },
  pageSubtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', paddingHorizontal: 24, marginTop: 4, marginBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  emptySubtext: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4', textAlign: 'center' },
  scroll: { paddingHorizontal: 24, paddingBottom: 120 },

  card: { borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  cardMerchant: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
  cardSub: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins-Regular' },
  cardStamps: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },

  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: 8 },
  miniCircle: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  miniFree: { fontSize: 6, fontFamily: 'Poppins-SemiBold' },

  progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 },

  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  rewardDesc: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: 'rgba(255,255,255,0.9)', flex: 1 },

  pendingRewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch', marginTop: 8, backgroundColor: '#27AE60', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  pendingRewardText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF', flex: 1 },
  freeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'stretch', marginTop: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  freeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#E67E22', letterSpacing: 0.5, flex: 1 },

  // Free redemption banner
  redeemBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 16, backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: '#F5D5B0' },
  redeemBannerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF0E0', alignItems: 'center', justifyContent: 'center' },
  redeemBannerTitle: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#E67E22' },
  redeemBannerSub: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#C4894D', marginTop: 1 },
});
