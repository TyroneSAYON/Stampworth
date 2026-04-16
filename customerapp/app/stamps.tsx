import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getStampRecordsForCard, getCustomerPendingRewards, deleteCustomerLoyaltyCard, getOrCreateCustomerProfile } from '@/lib/database';
import { supabase } from '@/lib/supabase';

const REWARD_CARD_W = 130;

type Params = {
  loyaltyCardId?: string;
  merchantId?: string;
  merchant?: string;
  collected?: string;
  total?: string;
  color?: string;
  iconName?: string;
  iconImageUrl?: string;
};

export default function StampsScreen() {
  const params = useLocalSearchParams<Params>();
  const merchantName = params.merchant || 'Store';
  const totalSlots = Number(params.total || 10);
  const cardColor = params.color || '#2F4366';
  const iconName = params.iconName || 'star';
  const iconImageUrl = params.iconImageUrl || null;

  const [loading] = useState(false);
  const [stampCount, setStampCount] = useState(Number(params.collected || 0));
  const [stampRecords, setStampRecords] = useState<{ id: string; earned_date: string }[]>([]);
  const [pendingRewards, setPendingRewards] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [rewardFlash, setRewardFlash] = useState(false);
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Fetch stamp records and rewards silently in background — no loading spinner
  useEffect(() => {
    if (params.loyaltyCardId) {
      getStampRecordsForCard(params.loyaltyCardId).then(({ data }) => {
        setStampRecords(data || []);
        setStampCount(data?.length || Number(params.collected || 0));
      });
    }
    if (params.merchantId) {
      getCustomerPendingRewards(params.merchantId).then(({ data }) => setPendingRewards(data || []));
    }
  }, []);

  // Realtime: listen to transactions, debounced
  useEffect(() => {
    if (!params.merchantId) return;
    let channel: any = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const setup = async () => {
      const { data: customer } = await getOrCreateCustomerProfile();
      if (!customer) return;
      channel = supabase
        .channel('stamps-rt-' + params.loyaltyCardId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `customer_id=eq.${customer.id}` }, (payload) => {
          const tx = payload.new as any;
          if (tx.transaction_type === 'REWARD_REDEEMED') {
            setPendingRewards((prev) => prev.slice(1));
          } else if (tx.transaction_type === 'STAMP_EARNED') {
            setStampCount((prev) => prev + 1);
          } else if (tx.transaction_type === 'REWARD_STORED') {
            setStampCount(0);
            setStampRecords([]);
            // Flash reward banner
            setRewardFlash(true);
            Animated.sequence([
              Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.delay(3000),
              Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => setRewardFlash(false));
            // Fetch new pending reward in background
            if (params.merchantId) {
              getCustomerPendingRewards(params.merchantId).then(({ data }) => setPendingRewards(data || []));
            }
          } else if (tx.transaction_type === 'STAMP_REMOVED') {
            setStampCount((prev) => Math.max(0, prev - 1));
          }
        })
        .subscribe();
    };
    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
      if (timer) clearTimeout(timer);
    };
  }, [params.loyaltyCardId, params.merchantId]);

  const handleDeleteCard = () => {
    Alert.alert(
      'Delete Loyalty Card',
      `Remove your loyalty card from ${merchantName}? This will delete all your stamps and rewards from this store. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Card',
          style: 'destructive',
          onPress: async () => {
            if (!params.loyaltyCardId || !params.merchantId) return;
            setDeleting(true);
            const { error } = await deleteCustomerLoyaltyCard(params.loyaltyCardId, params.merchantId);
            setDeleting(false);
            if (error) { Alert.alert('Failed', error.message); return; }
            Alert.alert('Card Deleted', `Your loyalty card from ${merchantName} has been removed.`);
            router.back();
          },
        },
      ]
    );
  };

  const renderIcon = (size: number, color: string) => {
    if (iconImageUrl) return <Image source={{ uri: iconImageUrl }} style={{ width: size, height: size }} contentFit="contain" />;
    return <Ionicons name={iconName as any} size={size} color={color} />;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const collectableSlots = totalSlots - 1;
  const pct = collectableSlots > 0 ? Math.min(100, (stampCount / collectableSlots) * 100) : 0;

  const slots = Array.from({ length: totalSlots }, (_, i) => ({
    id: i,
    isFree: i === totalSlots - 1,
    isFilled: i < totalSlots - 1 && i < stampCount,
    record: stampRecords[i] || null,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{merchantName}</Text>
            <Text style={styles.headerSub}>Loyalty Card</Text>
          </View>
          <TouchableOpacity onPress={handleDeleteCard} style={styles.deleteBtn} disabled={deleting}>
            <Ionicons name="trash-outline" size={18} color="#E74C3C" />
          </TouchableOpacity>
        </View>

        {/* Pending rewards carousel */}
        {pendingRewards.length > 0 && (
          <View style={styles.rewardsSection}>
            <Text style={styles.rewardsLabel}>{pendingRewards.length} reward{pendingRewards.length > 1 ? 's' : ''} earned</Text>
            <FlatList
              data={pendingRewards}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={REWARD_CARD_W + 10}
              decelerationRate="fast"
              contentContainerStyle={{ gap: 10 }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.rewardCard, { borderColor: cardColor }]}>
                  <Ionicons name="gift" size={18} color={cardColor} />
                  <Text style={[styles.rewardCardText, { color: cardColor }]} numberOfLines={1}>Free Reward</Text>
                  <Text style={styles.rewardCardDate}>{formatDate(item.created_at)}</Text>
                </View>
              )}
            />
          </View>
        )}

        {/* Free reward flash banner */}
        {rewardFlash && (
          <Animated.View style={[styles.rewardFlash, { opacity: flashAnim, transform: [{ scale: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
            <Ionicons name="gift" size={22} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardFlashTitle}>Free Reward Earned!</Text>
              <Text style={styles.rewardFlashText}>Your stamp card has been reset</Text>
            </View>
          </Animated.View>
        )}

        {/* Stamp card */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <View style={styles.cardTop}>
            <View style={styles.cardLogoCircle}>
              <Ionicons name="business" size={14} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName} numberOfLines={1}>{merchantName}</Text>
              <Text style={styles.cardLabel}>Loyalty Card</Text>
            </View>
            <Text style={styles.cardCount}>{stampCount}/{collectableSlots}</Text>
          </View>

          <View style={styles.grid}>
            {slots.map((slot) => (
              <View key={slot.id} style={styles.slot}>
                <View style={[
                  styles.circle,
                  slot.isFree
                    ? { backgroundColor: 'rgba(255,255,255,0.92)' }
                    : slot.isFilled
                      ? { backgroundColor: '#FFFFFF' }
                      : { backgroundColor: 'rgba(255,255,255,0.2)' },
                ]}>
                  {slot.isFree ? (
                    <Text style={[styles.freeLabel, { color: cardColor }]}>FREE</Text>
                  ) : slot.isFilled ? (
                    renderIcon(16, cardColor)
                  ) : null}
                </View>
                {slot.record && !slot.isFree ? (
                  <Text style={styles.dateText}>{formatDate(slot.record.earned_date)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={[styles.progressValue, { color: cardColor }]}>{stampCount}/{collectableSlots}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: cardColor }]} />
          </View>
        </View>


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },
  scroll: { flex: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FDE8E8', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', fontFamily: 'Poppins-SemiBold' },
  headerSub: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },

  // Rewards carousel
  rewardsSection: { marginBottom: 20 },
  rewardsLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  rewardCard: { width: REWARD_CARD_W, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderRadius: 12, padding: 12, alignItems: 'center', gap: 6 },
  rewardCardText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', textAlign: 'center' },
  rewardCardDate: { fontSize: 9, fontFamily: 'Poppins-Regular', color: '#8A94A6' },

  // Card
  card: { borderRadius: 18, padding: 16, marginBottom: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardLogoCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  cardLabel: { fontSize: 9, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.65)' },
  cardCount: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' },
  slot: { alignItems: 'center', width: '18%' },
  circle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  freeLabel: { fontSize: 9, fontFamily: 'Poppins-SemiBold', letterSpacing: 0.5 },
  dateText: { fontSize: 7, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  // Progress
  progressSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  progressValue: { fontSize: 13, fontFamily: 'Poppins-SemiBold' },
  progressBar: { height: 5, backgroundColor: '#F0F2F5', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },

  helperText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center' },

  // Reward flash
  rewardFlash: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E67E22', borderRadius: 14, padding: 16, marginBottom: 16 },
  rewardFlashTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  rewardFlashText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
});
