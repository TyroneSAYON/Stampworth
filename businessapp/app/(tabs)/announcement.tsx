import { useState } from 'react';
import { Alert, StyleSheet, View, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

interface Announcement {
  id: string;
  message: string;
  timestamp: Date;
  sent: boolean;
}

export default function AnnouncementScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [message, setMessage] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      message: 'Welcome to our loyalty program! Collect stamps and earn rewards.',
      timestamp: new Date(Date.now() - 86400000),
      sent: true,
    },
  ]);

  const handleSend = () => {
    if (!message.trim()) {
      Alert.alert('Required', 'Please enter an announcement message');
      return;
    }

    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      message: message.trim(),
      timestamp: new Date(),
      sent: false,
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    setMessage('');

    Alert.alert('Success', 'Announcement sent to all active loyalty card holders!', [
      {
        text: 'OK',
        onPress: () => {
          setAnnouncements((prev) =>
            prev.map((ann) => (ann.id === newAnnouncement.id ? { ...ann, sent: true } : ann))
          );
        },
      },
    ]);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => (
    <View style={[styles.messageBubble, { backgroundColor: item.sent ? '#E3F2FD' : '#F5F5F5' }]}>
      <View style={styles.messageHeader}>
        <Ionicons
          name={item.sent ? 'checkmark-circle' : 'time-outline'}
          size={16}
          color={item.sent ? '#2F4366' : theme.icon}
        />
        <Text style={[styles.timestamp, { color: theme.icon }]}>{formatTime(item.timestamp)}</Text>
      </View>
      <Text style={[styles.messageText, { color: theme.text }]}>{item.message}</Text>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/stampworthb-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.brandName}>Stampworth Business</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/(tabs)/options')}
        >
          <View style={styles.profileLogoContainer}>
            <Ionicons name="storefront" size={20} color="#2F4366" />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: '#2F4366' }]}>Announcements</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>
          Broadcast messages to all loyalty card holders
        </Text>
      </View>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={[styles.textInputContainer, { borderColor: theme.icon }]}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            style={[styles.textInput, { color: theme.text }]}
            placeholder="Type your announcement..."
            placeholderTextColor={theme.icon}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: '#2F4366' }]}
          onPress={handleSend}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
          <Text style={styles.sendButtonText}>Send to All</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <View style={styles.messagesContainer}>
        <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Recent Announcements</Text>
        <FlatList
          data={announcements}
          renderItem={renderAnnouncement}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2F4366',
    letterSpacing: 0.5,
    fontFamily: 'Poppins-SemiBold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  profileButton: {
    marginLeft: 16,
  },
  profileLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2F4366',
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F4366',
    marginBottom: 8,
    textAlign: 'left',
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  inputContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  textInputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    minHeight: 120,
  },
  textInput: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    minHeight: 100,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 10,
    gap: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
  },
  messagesList: {
    paddingBottom: 16,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
  },
});

