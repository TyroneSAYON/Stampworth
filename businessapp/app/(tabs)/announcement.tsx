import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, Text, TextInput, TouchableOpacity, SectionList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { saveMerchantAnnouncement, getMerchantAnnouncements, getCurrentMerchantProfile, getMerchantNotifications } from '@/lib/database';
import { sendAnnouncementNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

type Notification = { id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string };
type Announcement = { id: string; message: string; created_at: string; is_active: boolean };

export default function AnnouncementScreen() {
  const [message, setMessage] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeSection, setActiveSection] = useState<'inbox' | 'compose'>('inbox');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [lastSeenTime, setLastSeenTime] = useState<string | null>(null);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const loadedOnce = useRef(false);
  const storageLoaded = useRef(false);

  // Persist read state
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('biz_read_notifs'),
      AsyncStorage.getItem('biz_last_seen_notif'),
    ]).then(([r, t]) => {
      if (r) setReadIds(new Set(JSON.parse(r)));
      if (t) setLastSeenTime(t);
      storageLoaded.current = true;
    }).catch(() => { storageLoaded.current = true; });
  }, []);
  useEffect(() => { if (storageLoaded.current) AsyncStorage.setItem('biz_read_notifs', JSON.stringify([...readIds])).catch(() => {}); }, [readIds]);
  useEffect(() => { if (lastSeenTime) AsyncStorage.setItem('biz_last_seen_notif', lastSeenTime).catch(() => {}); }, [lastSeenTime]);

  const isNotifRead = (n: Notification) => n.isRead || readIds.has(n.id) || (lastSeenTime && new Date(n.createdAt).getTime() <= new Date(lastSeenTime).getTime());

  const loadAll = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const [annResult, notifResult] = await Promise.all([
      getMerchantAnnouncements(),
      getMerchantNotifications(),
    ]);
    if (annResult.data) setAnnouncements(annResult.data);
    if (notifResult.data) setNotifications(notifResult.data);
    setLoading(false);
    loadedOnce.current = true;
  };

  useFocusEffect(
    useCallback(() => {
      if (!loadedOnce.current) loadAll(true);
      else loadAll(false);
    }, [])
  );

  // Realtime: new messages and broadcasts
  useEffect(() => {
    const channel = supabase
      .channel('biz-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => loadAll(false))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dev_broadcasts' }, () => loadAll(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSend = async () => {
    if (!message.trim()) { Alert.alert('Required', 'Enter an announcement message.'); return; }
    setSending(true);
    const { data, error } = await saveMerchantAnnouncement(message.trim());
    if (error) { setSending(false); Alert.alert('Failed', error.message); return; }
    const { data: merchant } = await getCurrentMerchantProfile();
    let notifCount = 0;
    if (merchant) {
      const { sent } = await sendAnnouncementNotification(merchant.id, merchant.business_name || 'Stampworth', message.trim());
      notifCount = sent;
    }
    setSending(false);
    setMessage('');
    if (data) setAnnouncements([data, ...announcements]);
    setActiveSection('inbox');
    Alert.alert('Sent', `Announcement saved.${notifCount > 0 ? `\nNotified ${notifCount} customer${notifCount > 1 ? 's' : ''}.` : '\nNo customers to notify yet.'}`);
  };

  const markAllRead = () => { setReadIds(new Set(notifications.map((n) => n.id))); setLastSeenTime(new Date().toISOString()); };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !isNotifRead(n)).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ThemedView style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth Business</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/options')}>
          <Ionicons name="storefront" size={18} color="#2F4366" />
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>Notifications</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeSection === 'inbox' && styles.tabBtnActive]} onPress={() => setActiveSection('inbox')}>
          <Ionicons name="mail" size={16} color={activeSection === 'inbox' ? '#2F4366' : '#8A94A6'} />
          <Text style={[styles.tabText, activeSection === 'inbox' && styles.tabTextActive]}>Inbox</Text>
          {unreadCount > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{unreadCount}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeSection === 'compose' && styles.tabBtnActive]} onPress={() => setActiveSection('compose')}>
          <Ionicons name="megaphone" size={16} color={activeSection === 'compose' ? '#2F4366' : '#8A94A6'} />
          <Text style={[styles.tabText, activeSection === 'compose' && styles.tabTextActive]}>Broadcast</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /></View>
      ) : activeSection === 'inbox' ? (
        <>
          {unreadCount > 0 && (
            <View style={styles.unreadRow}>
              <Text style={styles.unreadLabel}>{unreadCount} new</Text>
              <TouchableOpacity onPress={markAllRead}><Text style={styles.readAllBtn}>Mark all as read</Text></TouchableOpacity>
            </View>
          )}
          {notifications.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={48} color="#C4CAD4" />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>Messages from customers and developers will appear here</Text>
            </View>
          ) : (
            <SectionList
              sections={[{ title: '', data: notifications }]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isRead = isNotifRead(item);
                const icon = item.type === 'dev_broadcast' ? 'megaphone' : 'person-circle';
                const iconColor = item.type === 'dev_broadcast' ? '#E67E22' : '#2F4366';
                const bgColor = item.type === 'dev_broadcast' ? '#FFF4E6' : '#E8F4FD';
                return (
                  <TouchableOpacity
                    style={[styles.notifCard, !isRead && styles.notifCardUnread]}
                    onPress={() => {
                      setReadIds((prev) => new Set(prev).add(item.id));
                      setSelectedNotif(item);
                    }}
                  >
                    <View style={[styles.notifIcon, { backgroundColor: bgColor }]}>
                      <Ionicons name={icon as any} size={18} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.notifTopRow}>
                        <Text style={[styles.notifTitle, !isRead && { color: '#1A1A2E' }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                      <Text style={styles.notifType}>{item.type === 'dev_broadcast' ? 'From Stampworth Dev Team' : 'Customer message'}</Text>
                    </View>
                    {!isRead && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              }}
              renderSectionHeader={() => null}
            />
          )}
        </>
      ) : (
        <>
          <View style={styles.composeCard}>
            <Text style={styles.composeLabel}>Send announcement to all your loyalty card holders</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              style={styles.composeInput}
              placeholder="Type your announcement..."
              placeholderTextColor="#C4CAD4"
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>{sending ? 'Sending...' : 'Send to All'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Sent Announcements</Text>
          {announcements.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyCardText}>No announcements sent yet</Text></View>
          ) : (
            announcements.map((item) => (
              <View key={item.id} style={styles.sentCard}>
                <View style={styles.sentHeader}>
                  <Ionicons name="checkmark-circle" size={14} color="#27AE60" />
                  <Text style={styles.sentTime}>{formatTime(item.created_at)}</Text>
                </View>
                <Text style={styles.sentText}>{item.message}</Text>
              </View>
            ))
          )}
        </>
      )}
      {/* Notification detail modal */}
      <Modal visible={!!selectedNotif} transparent animationType="fade" onRequestClose={() => setSelectedNotif(null)}>
        <Pressable style={styles.msgOverlay} onPress={() => setSelectedNotif(null)}>
          <Pressable style={styles.msgCard} onPress={() => {}}>
            {selectedNotif && (
              <>
                <View style={styles.msgAccent} />
                <View style={styles.msgInner}>
                  <View style={styles.msgHeader}>
                    <View style={[styles.msgIconCircle, { backgroundColor: selectedNotif.type === 'dev_broadcast' ? '#E67E22' : '#2F4366' }]}>
                      <Ionicons name={selectedNotif.type === 'dev_broadcast' ? 'megaphone' : 'person-circle'} size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.msgTitle}>{selectedNotif.title}</Text>
                      <View style={styles.msgMeta}>
                        <Ionicons name="time-outline" size={11} color="#8A94A6" />
                        <Text style={styles.msgTime}>{new Date(selectedNotif.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
                        <View style={styles.msgTypeBadge}>
                          <Text style={styles.msgTypeText}>{selectedNotif.type === 'dev_broadcast' ? 'Stampworth Dev Team' : 'Customer'}</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.msgCloseBtn} onPress={() => setSelectedNotif(null)}>
                      <Ionicons name="close" size={18} color="#8A94A6" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.msgDivider} />
                  <ScrollView style={styles.msgBody} showsVerticalScrollIndicator={false}>
                    <Text style={styles.msgText}>{selectedNotif.body}</Text>
                  </ScrollView>
                  <TouchableOpacity style={styles.msgDismissBtn} onPress={() => setSelectedNotif(null)}>
                    <Text style={styles.msgDismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E4EA' },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 20, marginBottom: 16 },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#E8F4FD' },
  tabText: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  tabTextActive: { color: '#2F4366' },
  tabBadge: { backgroundColor: '#E74C3C', borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },

  // Inbox
  unreadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 10 },
  unreadLabel: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  readAllBtn: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  list: { paddingHorizontal: 24, paddingBottom: 120 },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: '#2F4366' },
  notifIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  notifTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  notifTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', flex: 1, marginRight: 8 },
  notifTime: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  notifBody: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#1A1A2E', lineHeight: 18, marginBottom: 4 },
  notifType: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2F4366', marginTop: 4 },

  // Empty
  emptyText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  emptySubtext: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#C4CAD4', textAlign: 'center' },
  emptyCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyCardText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },

  // Compose
  composeCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 20 },
  composeLabel: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginBottom: 12 },
  composeInput: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', minHeight: 100, marginBottom: 14, padding: 0 },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, backgroundColor: '#2F4366', gap: 8 },
  sendButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Poppins-SemiBold' },

  // Sent
  sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#2F4366', paddingHorizontal: 24, marginBottom: 12 },
  sentCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10 },
  sentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sentTime: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  sentText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', lineHeight: 20 },

  // Notification detail modal
  msgOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  msgCard: { width: '100%', maxHeight: '75%', backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  msgAccent: { height: 4, backgroundColor: '#2F4366' },
  msgInner: { padding: 20 },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  msgIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  msgTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  msgTime: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  msgTypeBadge: { backgroundColor: '#F0F2F5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 4 },
  msgTypeText: { fontSize: 9, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  msgCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },
  msgDivider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 16 },
  msgBody: { maxHeight: 300 },
  msgText: { fontSize: 15, fontFamily: 'Poppins-Regular', color: '#3A3A4A', lineHeight: 24 },
  msgDismissBtn: { marginTop: 16, height: 44, borderRadius: 12, backgroundColor: '#F6F8FB', alignItems: 'center', justifyContent: 'center' },
  msgDismissText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
});
