import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getCustomerLoyaltyCards } from '@/lib/database';

export default function CardsScreen() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        const { data, error } = await getCustomerLoyaltyCards();
        if (!cancelled) {
          if (error) console.warn('Cards load error:', error.message);
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
            const iconName = card.stamp_settings?.stamp_icon_name || 'star';
            const iconImageUrl = card.stamp_settings?.stamp_icon_image_url || null;
            const collected = card.stamp_count || 0;
            const collectableSlots = total - 1;
            const pct = collectableSlots > 0 ? Math.min(100, (collected / collectableSlots) * 100) : 0;

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
                    <Ionicons name="business" size={18} color="#FFFFFF" />
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
                          <Text style={[styles.miniFree, { color }]}>F</Text>
                        ) : isFilled ? (
                          iconImageUrl ? (
                            <Image source={{ uri: iconImageUrl }} style={{ width: 10, height: 10 }} contentFit="contain" />
                          ) : (
                            <Ionicons name={iconName as any} size={10} color={color} />
                          )
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>

                {card.is_free_redemption && (
                  <View style={styles.freeBadge}>
                    <Ionicons name="gift" size={12} color="#FFFFFF" />
                    <Text style={styles.freeText}>REWARD AVAILABLE</Text>
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

  card: { borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  cardMerchant: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },
  cardSub: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins-Regular' },
  cardStamps: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' },

  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  miniCircle: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniFree: { fontSize: 7, fontFamily: 'Poppins-SemiBold' },

  progressBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: '#FFFFFF', borderRadius: 3 },

  freeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  freeText: { fontSize: 9, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF', letterSpacing: 0.5 },
});
