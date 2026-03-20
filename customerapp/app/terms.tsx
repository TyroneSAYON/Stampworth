import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TERMS_TEXT =
  'By using the Stampworth Loyalty Card system, you agree to these Terms of Service, which govern your access and use of the Stampworth application and its QR-based loyalty features, including the creation and use of a unique QR code, stamp tracking, and reward redemption; you agree to provide accurate information, keep your account and QR code secure, and use the system only for lawful and legitimate purposes, and you acknowledge that rewards, stamps, and promotions are managed and determined by participating partner businesses, meaning Stampworth is not responsible for disputes, changes, or cancellations of offers; Stampworth reserves the right to modify, suspend, or terminate any account or access to the system at any time if there is suspected misuse, fraud, or violation of these Terms; by continuing to use the Stampworth Loyalty Card system, you agree to comply with all updates to these Terms of Service.';

export default function TermsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#2F4366" />
        </TouchableOpacity>
        <Text style={[styles.title, { color: '#2F4366' }]}>Terms of Service</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="document-text-outline" size={22} color="#2F4366" />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Usage Agreement</Text>
            <Text style={styles.heroSubtitle}>Rules for account access, QR usage, stamps, and rewards.</Text>
          </View>
        </View>

        <View style={styles.keyRow}>
          <View style={styles.keyChip}>
            <Ionicons name="qr-code-outline" size={14} color="#2F4366" />
            <Text style={styles.keyChipText}>QR Security</Text>
          </View>
          <View style={styles.keyChip}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#2F4366" />
            <Text style={styles.keyChipText}>Lawful Use</Text>
          </View>
        </View>

        <View style={styles.contentCard}>
          <Text style={[styles.body, { color: theme.text }]}>{TERMS_TEXT}</Text>
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









