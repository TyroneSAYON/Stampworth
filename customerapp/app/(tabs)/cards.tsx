import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getCustomerLoyaltyCards } from '@/lib/database';

type LoyaltyCard = {
  id: string;
  merchant_id: string;
  stamp_count: number;
  total_stamps_earned: number;
  status: string;
  is_free_redemption: boolean;
  merchants: { business_name: string; logo_url: string | null } | null;
  stamp_settings: { stamps_per_redemption: number; card_color: string } | null;
};

export default function CardsScreen() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<LoyaltyCard[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        const { data } = await getCustomerLoyaltyCards();
        if (!cancelled) {
          setCards(data || []);
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
      </View>

      <Text style={styles.pageTitle}>My Cards</Text>
      <Text style={styles.pageSubtitle}>Your loyalty card collection</Text>

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
            const collected = card.stamp_count || 0;
            const pct = Math.min(100, (collected / total) * 100);

            return (
              <TouchableOpacity
                key={card.id}
                style={[styles.card, { backgroundColor: color }]}
                onPress={() => router.push({ pathname: '/stamps', params: { merchant: merchantName, collected: String(collected), total: String(total), color } })}
              >
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="business" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMerchant} numberOfLines={1}>{merchantName}</Text>
                    <Text style={styles.cardSub}>Loyalty Card</Text>
                  </View>
                  <Text style={styles.cardStamps}>{collected}/{total}</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
                {card.is_free_redemption && (
                  <View style={styles.freeBadge}>
                    <Ionicons name="gift" size={12} color="#FFFFFF" />
                    <Text style={styles.freeText}>FREE REDEMPTION</Text>
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
  card: { borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  cardMerchant: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
  cardSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins-Regular' },
  cardStamps: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#FFFFFF', borderRadius: 3 },
  freeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  freeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF', letterSpacing: 0.5 },
});
