import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getStampRecordsForCard, getCustomerPendingRewards, deleteCustomerLoyaltyCard } from '@/lib/database';
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

  const [loading, setLoading] = useState(true);
  const [stampCount, setStampCount] = useState(Number(params.collected || 0));
  const [stampRecords, setStampRecords] = useState<{ id: string; earned_date: string }[]>([]);
  const [pendingRewards, setPendingRewards] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);

  const loadStampData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    if (params.loyaltyCardId) {
      const { data } = await getStampRecordsForCard(params.loyaltyCardId);
      setStampRecords(data || []);
      setStampCount(data?.length || Number(params.collected || 0));
    }
    if (params.merchantId) {
      const { data: rewards } = await getCustomerPendingRewards(params.merchantId);
      setPendingRewards(rewards || []);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadStampData();
    }, [params.loyaltyCardId, params.merchantId])
  );

  // Realtime: subscribe to stamp and reward changes for this card
  useEffect(() => {
    if (!params.loyaltyCardId) return;
    const channel = supabase
      .channel('stamps-realtime-' + params.loyaltyCardId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stamps', filter: `loyalty_card_id=eq.${params.loyaltyCardId}` }, () => loadStampData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'redeemed_rewards' }, () => loadStampData(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [params.loyaltyCardId]);

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

        {/* Stamp card */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <View style={styles.cardTop}>
            <View style={styles.cardLogoCircle}>
              <Ionicons name="business" size={16} color="#FFFFFF" />
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
                    renderIcon(20, cardColor)
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

        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={cardColor} />
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },
  scroll: { flex: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FDE8E8', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', fontFamily: 'Poppins-SemiBold' },
  headerSub: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },

  // Rewards carousel
  rewardsSection: { marginBottom: 20 },
  rewardsLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  rewardCard: { width: REWARD_CARD_W, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderRadius: 12, padding: 12, alignItems: 'center', gap: 6 },
  rewardCardText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', textAlign: 'center' },
  rewardCardDate: { fontSize: 9, fontFamily: 'Poppins-Regular', color: '#8A94A6' },

  // Card
  card: { flex: 1, minHeight: 480, borderRadius: 20, padding: 24, marginBottom: 16, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardLogoCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  cardLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.65)' },
  cardCount: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center', flex: 1 },
  slot: { alignItems: 'center', width: '22%' },
  circle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  freeLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', letterSpacing: 0.5 },
  dateText: { fontSize: 8, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  // Progress
  progressSection: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  progressValue: { fontSize: 14, fontFamily: 'Poppins-SemiBold' },
  progressBar: { height: 7, backgroundColor: '#F0F2F5', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 4 },

  helperText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center' },
});
