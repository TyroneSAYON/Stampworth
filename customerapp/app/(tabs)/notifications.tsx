import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getOrCreateCustomerProfile, getCustomerAnnouncements } from '@/lib/database';
import { supabase } from '@/lib/supabase';

type Announcement = {
  id: string;
  merchant_id: string;
  message: string;
  created_at: string;
  merchants: { business_name: string } | null;
  isRead?: boolean;
};

export default function NotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const customerIdRef = useRef<string | null>(null);

  const loadAnnouncements = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { data: customer } = await getOrCreateCustomerProfile();
    if (!customer) { setLoading(false); return; }
    customerIdRef.current = customer.id;
    const { data } = await getCustomerAnnouncements(customer.id);
    setAnnouncements(data || []);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
    }, [])
  );

  // Realtime: subscribe to new announcements
  useEffect(() => {
    const channel = supabase
      .channel('announcements-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'merchant_announcements' }, () => loadAnnouncements(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setReadIds((prev) => new Set(prev).add(id));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#2F4366" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 38 }} />
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadRow}>
          <Text style={styles.unreadLabel}>{unreadCount} new</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /></View>
      ) : announcements.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={48} color="#C4CAD4" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>Announcements from your favourite stores will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isRead = readIds.has(item.id);
            const isExpanded = expandedId === item.id;
            const merchantName = item.merchants?.business_name || 'Store';

            return (
              <TouchableOpacity
                style={[styles.notifCard, !isRead && styles.notifCardUnread]}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.notifRow}>
                  <View style={[styles.notifIcon, !isRead && styles.notifIconUnread]}>
                    <Ionicons name="megaphone" size={18} color={!isRead ? '#2F4366' : '#8A94A6'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.notifTopRow}>
                      <Text style={[styles.notifMerchant, !isRead && { color: '#1A1A2E' }]} numberOfLines={1}>{merchantName}</Text>
                      <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
                    </View>
                    <Text style={[styles.notifPreview, !isRead && { color: '#1A1A2E' }]} numberOfLines={isExpanded ? undefined : 2}>
                      {item.message}
                    </Text>
                  </View>
                  {!isRead && <View style={styles.dot} />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', textAlign: 'center' },

  unreadRow: { paddingHorizontal: 24, marginTop: 12, marginBottom: 8 },
  unreadLabel: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },

  emptyText: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  emptySubtext: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4', textAlign: 'center' },

  list: { paddingHorizontal: 24, paddingBottom: 120 },

  notifCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8 },
  notifCardUnread: { backgroundColor: '#EDF4FF' },

  notifRow: { flexDirection: 'row', gap: 12 },
  notifIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },
  notifIconUnread: { backgroundColor: '#D6E6FF' },

  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifMerchant: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', flex: 1, marginRight: 8 },
  notifTime: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  notifPreview: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', lineHeight: 19 },

  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2F4366', marginTop: 4 },
});
