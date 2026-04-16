import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Modal, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getCustomerLoyaltyCardProgress,
  getStampRecords,
  issueStampForCustomer,
  removeLatestStampForCustomer,
  storeCustomerReward,
  getPendingRewards,
  claimReward,
} from '@/lib/database';

const REWARD_CARD_WIDTH = 140;

type PendingReward = { id: string; reward_code: string; stamps_used: number; created_at: string };

export default function CustomerCardScreen() {
  const { customerId, merchantId, source, reference } = useLocalSearchParams<{
    customerId: string; merchantId: string; source?: string; reference?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [stamping, setStamping] = useState(false);
  const [customerName, setCustomerName] = useState('Customer');
  const [customerCode, setCustomerCode] = useState('');
  const [merchantName, setMerchantName] = useState('Store');
  const [stampCount, setStampCount] = useState(0);
  const [stampsRequired, setStampsRequired] = useState(10);
  const [rewardDescription, setRewardDescription] = useState('');
  const [cardColor, setCardColor] = useState('#2F4366');
  const [stampIconName, setStampIconName] = useState('star');
  const [stampIconImageUrl, setStampIconImageUrl] = useState<string | null>(null);
  const [stampRecords, setStampRecords] = useState<{ id: string; earned_date: string }[]>([]);
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [stampQty, setStampQty] = useState(0);
  const [rewardModal, setRewardModal] = useState<{ name: string; reward: string; code: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (customerId && merchantId) loadData();
    }, [customerId, merchantId])
  );

  const loadData = async () => {
    if (stampCount === 0 && stampRecords.length === 0) setLoading(true);
    const { data, error } = await getCustomerLoyaltyCardProgress(merchantId!, customerId!);
    if (error || !data) { Alert.alert('Error', error?.message || 'Could not load card.'); setLoading(false); return; }

    setCustomerName(data.customer.full_name || data.customer.username || 'Customer');
    setCustomerCode(data.customer.id.slice(0, 8).toUpperCase());
    setMerchantName((data as any).merchantName || 'Store');
    setStampCount(data.stampCount);
    setStampsRequired(data.stampsPerRedemption);
    setRewardDescription(data.rewardDescription || '');
    setCardColor(data.cardColor);
    setStampIconName(data.stampIconName);
    setStampIconImageUrl(data.stampIconImageUrl);

    const { data: records } = await getStampRecords(merchantId!, customerId!);
    setStampRecords(records || []);

    const { data: rewards } = await getPendingRewards(merchantId!, customerId!);
    setPendingRewards(rewards || []);
    setStampQty(0);
    setLoading(false);

    // Auto-trigger reward if card is already full but wasn't reset
    const spr = data.stampsPerRedemption || 10;
    if (data.stampCount >= spr - 1 && data.stampCount > 0) {
      const rewardResult = await storeCustomerReward(merchantId!, customerId!);
      if (rewardResult?.data) {
        const desc = rewardResult.data.rewardDescription || data.rewardDescription || 'Free Reward';
        setRewardModal({ name: data.customer.full_name || 'Customer', reward: desc, code: rewardResult.data.rewardCode });
        // Refresh to show reset state
        const { data: freshData } = await getCustomerLoyaltyCardProgress(merchantId!, customerId!);
        if (freshData) {
          setStampCount(freshData.stampCount);
          const { data: freshRecords } = await getStampRecords(merchantId!, customerId!);
          setStampRecords(freshRecords || []);
          const { data: freshRewards } = await getPendingRewards(merchantId!, customerId!);
          setPendingRewards(freshRewards || []);
        }
      }
    }
  };

  const renderIcon = (size: number, color: string) => {
    if (stampIconImageUrl) return <Image source={{ uri: stampIconImageUrl }} style={{ width: size, height: size }} contentFit="contain" />;
    return <Ionicons name={stampIconName as any} size={size} color={color} />;
  };

  const collectableSlots = stampsRequired - 1;
  const maxAdd = Math.max(0, collectableSlots - stampCount);

  const handleOkay = async () => {
    if (!merchantId || !customerId || stampQty <= 0) return;
    setStamping(true);
    const qty = stampQty;
    setStampQty(0);

    let freeReached = false;
    for (let i = 0; i < qty; i++) {
      const { data, error } = await issueStampForCustomer(merchantId, customerId, (source as 'QR' | 'MANUAL') || 'QR', reference);
      if (error) { Alert.alert('Failed', error.message); break; }
      if (data?.freeRedemptionReached) {
        freeReached = true;
        const rewardResult = await storeCustomerReward(merchantId, customerId);
        const desc = rewardResult?.data?.rewardDescription || rewardDescription || 'Free Reward';
        setRewardModal({ name: customerName, reward: desc, code: rewardResult?.data?.rewardCode || '' });
        break;
      }
    }
    setStamping(false);
    await loadData();
  };

  const handleRemoveOne = async () => {
    if (!merchantId || !customerId || stampCount <= 0) return;
    setStamping(true);
    const { error } = await removeLatestStampForCustomer(merchantId, customerId, (source as 'QR' | 'MANUAL') || 'QR', reference);
    setStamping(false);
    if (error) { Alert.alert('Failed', error.message); return; }
    await loadData();
  };

  const handleClaim = (reward: PendingReward) => {
    Alert.alert('Redeem Reward', `${rewardDescription || 'Free Reward'}\nCode: ${reward.reward_code}`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Redeem', onPress: async () => {
        const { error } = await claimReward(reward.id);
        if (error) { Alert.alert('Failed', error.message); return; }
        Alert.alert('Redeemed!', `Code: ${reward.reward_code}`);
        await loadData();
      }},
    ]);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) {
    return <View style={styles.container}><View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /></View></View>;
  }

  const previewCount = Math.min(stampCount + stampQty, collectableSlots);
  const slots = Array.from({ length: stampsRequired }, (_, i) => ({
    id: i,
    isFree: i === stampsRequired - 1,
    isFilled: i < stampsRequired - 1 && i < stampCount,
    isPreview: i < stampsRequired - 1 && i >= stampCount && i < previewCount,
    record: stampRecords[i] || null,
  }));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{customerName}</Text>
            <Text style={styles.code}>{customerCode}</Text>
          </View>
        </View>

        {/* Pending rewards — horizontal carousel */}
        {pendingRewards.length > 0 && (
          <View style={styles.rewardsSection}>
            <Text style={styles.rewardsLabel}>{pendingRewards.length} reward{pendingRewards.length > 1 ? 's' : ''} available</Text>
            <FlatList
              data={pendingRewards}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={REWARD_CARD_WIDTH + 10}
              decelerationRate="fast"
              contentContainerStyle={styles.rewardsCarousel}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.rewardCard, { borderColor: cardColor }]} onPress={() => handleClaim(item)} activeOpacity={0.7}>
                  <View style={[styles.rewardIconCircle, { backgroundColor: `${cardColor}14` }]}>
                    <Ionicons name="gift" size={18} color={cardColor} />
                  </View>
                  <Text style={[styles.rewardCardTitle, { color: cardColor }]} numberOfLines={1}>{rewardDescription || 'Free Reward'}</Text>
                  <Text style={styles.rewardCardDate}>{formatDate(item.created_at)}</Text>
                  <View style={[styles.redeemPill, { backgroundColor: cardColor }]}>
                    <Text style={styles.redeemPillText}>Redeem</Text>
                  </View>
                </TouchableOpacity>
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
              <Text style={styles.cardMerchant} numberOfLines={1}>{merchantName}</Text>
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
                      : slot.isPreview
                        ? { backgroundColor: 'rgba(255,255,255,0.45)' }
                        : { backgroundColor: 'rgba(255,255,255,0.2)' },
                ]}>
                  {slot.isFree ? (
                    <Text style={[styles.freeLabel, { color: cardColor }]}>FREE</Text>
                  ) : slot.isFilled ? (
                    renderIcon(20, cardColor)
                  ) : slot.isPreview ? (
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

        {/* Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.qtyLabel}>Number of stamps to add</Text>

          <View style={styles.qtyRow}>
            <TouchableOpacity style={[styles.qtyBtn, stampQty <= 0 && { borderColor: '#E8E8E8' }]} onPress={() => setStampQty(Math.max(0, stampQty - 1))} disabled={stampQty <= 0}>
              <Text style={[styles.qtyBtnText, stampQty <= 0 && { color: '#D0D5DD' }]}>—</Text>
            </TouchableOpacity>

            <View style={[styles.qtyBadge, { backgroundColor: `${cardColor}14` }]}>
              <Text style={[styles.qtyNumber, { color: cardColor }]}>{stampQty}</Text>
            </View>

            <TouchableOpacity style={[styles.qtyBtn, stampQty >= maxAdd && { borderColor: '#E8E8E8' }]} onPress={() => setStampQty(Math.min(stampQty + 1, maxAdd))} disabled={stampQty >= maxAdd}>
              <Text style={[styles.qtyBtnText, stampQty >= maxAdd && { color: '#D0D5DD' }]}>+</Text>
            </TouchableOpacity>
          </View>

          {stampCount > 0 && (
            <TouchableOpacity style={styles.removeRow} onPress={handleRemoveOne} disabled={stamping}>
              <Ionicons name="remove-circle-outline" size={15} color="#E74C3C" />
              <Text style={styles.removeText}>Remove last stamp</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Okay */}
        <TouchableOpacity
          style={[styles.okayBtn, { backgroundColor: stampQty > 0 ? cardColor : '#D0D5DD' }]}
          onPress={handleOkay}
          disabled={stamping || stampQty <= 0}
        >
          {stamping ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.okayText}>Okay</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Reward earned modal */}
      <Modal visible={!!rewardModal} transparent animationType="fade">
        <View style={styles.rewardOverlay}>
          <View style={styles.rewardModalCard}>
            <View style={[styles.rewardIconBg, { backgroundColor: `${cardColor}14` }]}>
              <Ionicons name="gift" size={32} color={cardColor} />
            </View>
            <Text style={styles.rewardTitle}>Reward Unlocked</Text>
            <Text style={styles.rewardName}>{rewardModal?.name}</Text>
            <View style={styles.rewardDivider} />
            <Text style={styles.rewardLabel}>REWARD</Text>
            <Text style={[styles.rewardValue, { color: cardColor }]}>{rewardModal?.reward}</Text>
            <Text style={styles.rewardLabel}>CODE</Text>
            <Text style={styles.rewardCode}>{rewardModal?.code}</Text>
            <Text style={styles.rewardNote}>Card has been reset</Text>
            <TouchableOpacity style={[styles.rewardBtn, { backgroundColor: cardColor }]} onPress={() => setRewardModal(null)}>
              <Text style={styles.rewardBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', fontFamily: 'Poppins-SemiBold' },
  code: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },

  // Rewards — carousel
  rewardsSection: { marginBottom: 24 },
  rewardsLabel: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  rewardsCarousel: { gap: 10 },
  rewardCard: { width: REWARD_CARD_WIDTH, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8 },
  rewardIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rewardCardTitle: { fontSize: 12, fontFamily: 'Poppins-SemiBold', textAlign: 'center' },
  rewardCardDate: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  redeemPill: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5 },
  redeemPillText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Poppins-SemiBold' },

  // Card
  card: { borderRadius: 20, padding: 18, marginBottom: 36 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardLogoCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  cardMerchant: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  cardLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.65)' },
  cardCount: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { alignItems: 'center' },
  circle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  freeLabel: { fontSize: 9, fontFamily: 'Poppins-SemiBold', letterSpacing: 0.5 },
  dateText: { fontSize: 6, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  // Controls
  controlsSection: { alignItems: 'center', marginBottom: 36 },
  qtyLabel: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginBottom: 16 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  qtyBtn: { width: 52, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: '#C4CAD4', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  qtyBtnText: { fontSize: 18, color: '#1A1A2E', fontFamily: 'Poppins-SemiBold' },
  qtyBadge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  qtyNumber: { fontSize: 22, fontWeight: '700', fontFamily: 'Poppins-SemiBold' },

  removeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16 },
  removeText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#E74C3C' },

  // Okay
  okayBtn: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginHorizontal: 48 },
  okayText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', fontFamily: 'Poppins-SemiBold' },

  // Reward modal
  rewardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  rewardModalCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center' },
  rewardIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  rewardTitle: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', marginBottom: 4 },
  rewardName: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginBottom: 20 },
  rewardDivider: { width: 40, height: 2, backgroundColor: '#F0F2F5', borderRadius: 1, marginBottom: 20 },
  rewardLabel: { fontSize: 9, fontFamily: 'Poppins-SemiBold', color: '#B0B8C4', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  rewardValue: { fontSize: 16, fontFamily: 'Poppins-SemiBold', marginBottom: 16 },
  rewardCode: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', letterSpacing: 2, marginBottom: 16 },
  rewardNote: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#C4CAD4', marginBottom: 24 },
  rewardBtn: { width: '100%', height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rewardBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
});
