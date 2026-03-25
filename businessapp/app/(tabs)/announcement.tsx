import { useState, useCallback } from 'react';
import { Alert, ActivityIndicator, StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { saveMerchantAnnouncement, getMerchantAnnouncements } from '@/lib/database';

interface Announcement {
  id: string;
  message: string;
  created_at: string;
  is_active: boolean;
}

export default function AnnouncementScreen() {
  const [message, setMessage] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
    }, [])
  );

  const loadAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await getMerchantAnnouncements();
    if (data) setAnnouncements(data);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!message.trim()) { Alert.alert('Required', 'Enter an announcement message.'); return; }
    setSending(true);
    const { data, error } = await saveMerchantAnnouncement(message.trim());
    setSending(false);

    if (error) {
      Alert.alert('Failed', error.message || 'Could not save announcement.');
      return;
    }

    setMessage('');
    if (data) setAnnouncements([data, ...announcements]);
    Alert.alert('Sent', 'Announcement saved and sent to all loyalty card holders!');
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

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/options')}>
          <Ionicons name="storefront" size={18} color="#2F4366" />
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>Announcements</Text>
      <Text style={styles.pageSubtitle}>Broadcast to all loyalty card holders</Text>

      {/* Compose */}
      <View style={styles.composeCard}>
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

      {/* List */}
      <Text style={styles.sectionTitle}>Recent</Text>
      {loading ? (
        <View style={styles.loadingRow}><ActivityIndicator size="small" color="#2F4366" /></View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyText}>No announcements yet</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <Ionicons name="checkmark-circle" size={14} color="#27AE60" />
                <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
              </View>
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E4EA' },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 20 },
  pageSubtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', paddingHorizontal: 24, marginTop: 4, marginBottom: 20 },
  composeCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 24 },
  composeInput: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', minHeight: 80, marginBottom: 14, padding: 0 },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, backgroundColor: '#2F4366', gap: 8 },
  sendButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Poppins-SemiBold' },
  sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#2F4366', paddingHorizontal: 24, marginBottom: 12 },
  list: { paddingHorizontal: 24, paddingBottom: 120 },
  loadingRow: { alignItems: 'center', paddingTop: 24 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  messageCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  messageTime: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  messageText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E', lineHeight: 20 },
});
