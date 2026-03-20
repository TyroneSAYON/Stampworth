import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const POLICY_TEXT =
  'By using the Stampworth Loyalty Card system, you agree to this Privacy Policy, which explains how we collect, use, and protect your information; we may collect personal data such as your name, contact details, account information, QR code, and usage activity to enable loyalty features like stamp tracking and reward management, and we use this information to operate, maintain, and improve the Stampworth system, provide customer support, and facilitate communication between users and partner businesses; your data may be shared with authorized partner merchants only when necessary to process rewards and ensure proper system functionality, and we implement reasonable security measures to protect your information, although no system can guarantee complete security; you have the right to access, update, or request deletion of your personal data, and by continuing to use the Stampworth Loyalty Card system, you consent to the collection, use, and processing of your information in accordance with this Privacy Policy and any future updates.';

export default function PolicyScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#2F4366" />
        </TouchableOpacity>
        <Text style={[styles.title, { color: '#2F4366' }]}>Privacy Policy</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#2F4366" />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Privacy Commitment</Text>
            <Text style={styles.heroSubtitle}>How Stampworth collects, uses, and protects customer data.</Text>
          </View>
        </View>

        <View style={styles.keyRow}>
          <View style={styles.keyChip}>
            <Ionicons name="lock-closed-outline" size={14} color="#2F4366" />
            <Text style={styles.keyChipText}>Data Security</Text>
          </View>
          <View style={styles.keyChip}>
            <Ionicons name="people-outline" size={14} color="#2F4366" />
            <Text style={styles.keyChipText}>Merchant Access</Text>
          </View>
        </View>

        <View style={styles.contentCard}>
          <Text style={[styles.body, { color: theme.text }]}>{POLICY_TEXT}</Text>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backButton: {
    marginRight: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FA',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 12,
  },
  heroCard: {
    borderRadius: 14,
    backgroundColor: '#F2F6FC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDE9F8',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: '#2F4366',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  heroSubtitle: {
    marginTop: 2,
    color: '#50617A',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins-Regular',
  },
  keyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8E1EE',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  keyChipText: {
    color: '#2F4366',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  contentCard: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  body: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
  },
});









