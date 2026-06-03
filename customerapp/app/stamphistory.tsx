import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getCustomerStampHistory, StampHistoryRecord } from '@/lib/database';

// Stamps from the same merchant within 5 minutes → one visit
const VISIT_WINDOW_MS = 5 * 60 * 1000;

type StampVisit = {
  id: string;
  merchant_id: string | null;
  merchant_name: string;
  merchant_logo: string | null;
  earned_date: string;
  stamp_count: number;
};

type ListItem =
  | { type: 'header'; label: string; visitCount: number; stampCount: number }
  | { type: 'visit'; data: StampVisit; isFirst: boolean; isLast: boolean };

const groupIntoVisits = (stamps: StampHistoryRecord[]): StampVisit[] => {
  if (stamps.length === 0) return [];
  const visits: StampVisit[] = [];
  let group: StampHistoryRecord[] = [stamps[0]];

  for (let i = 1; i < stamps.length; i++) {
    const prev = group[group.length - 1];
    const curr = stamps[i];
    const sameMerchant = prev.merchant_id === curr.merchant_id;
    const timeDiff = new Date(group[0].earned_date).getTime() - new Date(curr.earned_date).getTime();
    if (sameMerchant && timeDiff <= VISIT_WINDOW_MS) {
      group.push(curr);
    } else {
      visits.push({
        id: group[0].id,
        merchant_id: group[0].merchant_id,
        merchant_name: group[0].merchant_name,
        merchant_logo: group[0].merchant_logo,
        earned_date: group[0].earned_date,
        stamp_count: group.length,
      });
      group = [curr];
    }
  }
  visits.push({
    id: group[0].id,
    merchant_id: group[0].merchant_id,
    merchant_name: group[0].merchant_name,
    merchant_logo: group[0].merchant_logo,
    earned_date: group[0].earned_date,
    stamp_count: group.length,
  });
  return visits;
};

const pad = (n: number) => String(n).padStart(2, '0');

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatDay = (dateStr: string) => DAYS[new Date(dateStr).getDay()];
const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const getDayKey = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const getGroupLabel = (dateStr: string) => {
  const now = new Date();
  const todayKey = getDayKey(now.toISOString());
  const key = getDayKey(dateStr);
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (key === todayKey) return 'Today';
  if (key === getDayKey(yest.toISOString())) return 'Yesterday';
  return formatFullDate(dateStr);
};

export default function StampHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [stamps, setStamps] = useState<StampHistoryRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const { data } = await getCustomerStampHistory();
        if (active) {
          setStamps(data || []);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  const visits = groupIntoVisits(stamps);

  // Build grouped list items (visits grouped by calendar day)
  const listItems: ListItem[] = [];
  let lastKey = '';

  visits.forEach((visit, idx) => {
    const key = getDayKey(visit.earned_date);
    const prevKey = visits[idx - 1] ? getDayKey(visits[idx - 1].earned_date) : null;
    const nextKey = visits[idx + 1] ? getDayKey(visits[idx + 1].earned_date) : null;

    if (key !== lastKey) {
      let visitCount = 1;
      let stampCount = visit.stamp_count;
      for (let j = idx + 1; j < visits.length; j++) {
        if (getDayKey(visits[j].earned_date) === key) {
          visitCount++;
          stampCount += visits[j].stamp_count;
        } else break;
      }
      listItems.push({ type: 'header', label: getGroupLabel(visit.earned_date), visitCount, stampCount });
      lastKey = key;
    }

    listItems.push({
      type: 'visit',
      data: visit,
      isFirst: prevKey !== key,
      isLast: nextKey !== key,
    });
  });

  const latestVisit = visits[0] || null;
  const totalStamps = stamps.length;

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupLabel}>{item.label}</Text>
          <View style={styles.groupLine} />
          <View style={styles.groupMeta}>
            <Text style={styles.groupMetaText}>{item.stampCount} stamp{item.stampCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      );
    }

    const { data: visit, isFirst, isLast } = item;
    const isMultiple = visit.stamp_count > 1;

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineLineTop, isFirst && styles.lineHidden]} />
          <View style={[styles.timelineNode, isMultiple && styles.timelineNodeMulti]}>
            {visit.merchant_logo ? (
              <Image source={{ uri: visit.merchant_logo }} style={styles.nodeImg} contentFit="cover" />
            ) : (
              <Ionicons name="storefront" size={12} color={isMultiple ? '#FFFFFF' : '#2F4366'} />
            )}
          </View>
          <View style={[styles.timelineLineBottom, isLast && styles.lineHidden]} />
        </View>

        <View style={styles.stampCard}>
          <View style={styles.stampCardTop}>
            <Text style={styles.stampMerchant} numberOfLines={1}>{visit.merchant_name}</Text>
            <Text style={styles.stampTime}>{formatTime(visit.earned_date)}</Text>
          </View>

          <View style={styles.stampLabelRow}>
            <View style={styles.stampDot} />
            <Text style={styles.stampLabel}>
              {visit.stamp_count} stamp{visit.stamp_count !== 1 ? 's' : ''} earned
            </Text>
            {isMultiple && (
              <View style={styles.stampCountBadge}>
                <Ionicons name="add" size={9} color="#FFFFFF" />
                <Text style={styles.stampCountBadgeText}>{visit.stamp_count}</Text>
              </View>
            )}
          </View>

          <Text style={styles.stampDate}>{formatDay(visit.earned_date)} · {formatFullDate(visit.earned_date)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#2F4366" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Stamp History</Text>
          {!loading && totalStamps > 0 && (
            <Text style={styles.headerSub}>{totalStamps} stamp{totalStamps !== 1 ? 's' : ''} · {visits.length} visit{visits.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : totalStamps === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={36} color="#B0B8C4" />
          </View>
          <Text style={styles.emptyTitle}>No stamps yet</Text>
          <Text style={styles.emptySub}>Visit a Stampworth partner store and scan your QR code to start collecting stamps.</Text>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item) =>
            item.type === 'header' ? `h-${item.label}` : `v-${item.data.id}`
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            latestVisit ? (
              <View style={styles.latestCard}>
                <View style={styles.latestBadgeRow}>
                  <View style={styles.latestBadge}>
                    <Ionicons name="flash" size={11} color="#FFFFFF" />
                    <Text style={styles.latestBadgeText}>Latest Visit</Text>
                  </View>
                  {latestVisit.stamp_count > 1 && (
                    <View style={styles.latestStampCountBadge}>
                      <Text style={styles.latestStampCountText}>+{latestVisit.stamp_count} stamps</Text>
                    </View>
                  )}
                </View>
                <View style={styles.latestContent}>
                  <View style={styles.latestLogoCircle}>
                    {latestVisit.merchant_logo ? (
                      <Image source={{ uri: latestVisit.merchant_logo }} style={styles.latestLogoImg} contentFit="cover" />
                    ) : (
                      <Ionicons name="storefront" size={24} color="#2F4366" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.latestMerchant}>{latestVisit.merchant_name}</Text>
                    <Text style={styles.latestStampLine}>
                      {latestVisit.stamp_count} stamp{latestVisit.stamp_count !== 1 ? 's' : ''} earned
                    </Text>
                    <Text style={styles.latestWhen}>
                      {getGroupLabel(latestVisit.earned_date)} · {formatTime(latestVisit.earned_date)}
                    </Text>
                    <Text style={styles.latestFull}>
                      {formatDay(latestVisit.earned_date)}, {formatFullDate(latestVisit.earned_date)}
                    </Text>
                  </View>
                  <View style={styles.latestCheck}>
                    <Ionicons name="checkmark-circle" size={28} color="#27AE60" />
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F2F5',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#F6F8FB',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  headerSub: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  loadingText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  emptySub: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4', textAlign: 'center', lineHeight: 20 },

  list: { padding: 20, paddingBottom: 48 },

  // Latest visit card
  latestCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 28,
    shadowColor: '#2F4366', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 4,
  },
  latestBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  latestBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2F4366', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  latestBadgeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF', letterSpacing: 0.3 },
  latestStampCountBadge: {
    backgroundColor: '#E8F8EE', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  latestStampCountText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#27AE60' },
  latestContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  latestLogoCircle: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: '#EEF2F8',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  latestLogoImg: { width: 54, height: 54, borderRadius: 27 },
  latestMerchant: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', marginBottom: 2 },
  latestStampLine: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#27AE60', marginBottom: 2 },
  latestWhen: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  latestFull: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 1 },
  latestCheck: { paddingLeft: 4 },

  // Group header
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 4 },
  groupLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.9 },
  groupLine: { flex: 1, height: 1, backgroundColor: '#E8EDF2' },
  groupMeta: {
    backgroundColor: '#E8EDF2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  groupMetaText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },

  // Timeline
  timelineRow: { flexDirection: 'row', minHeight: 72 },
  timelineLeft: { width: 36, alignItems: 'center' },
  timelineLineTop: { width: 2, flex: 1, backgroundColor: '#DDE3EF', minHeight: 10 },
  timelineNode: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEF2F8',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#2F4366', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  timelineNodeMulti: { backgroundColor: '#2F4366' },
  nodeImg: { width: 30, height: 30, borderRadius: 15 },
  timelineLineBottom: { width: 2, flex: 1, backgroundColor: '#DDE3EF', minHeight: 10 },
  lineHidden: { opacity: 0 },

  // Stamp visit card
  stampCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    marginLeft: 10, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  stampCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  stampMerchant: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E', flex: 1, marginRight: 8 },
  stampTime: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  stampLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  stampDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27AE60' },
  stampLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#27AE60', flex: 1 },
  stampCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 1,
    backgroundColor: '#2F4366', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  stampCountBadgeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  stampDate: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#A0A8B5' },
});
