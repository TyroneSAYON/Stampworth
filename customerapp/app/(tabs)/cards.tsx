import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CardsScreen() {
  const colorScheme = useColorScheme();

  const merchantName = 'Coffee Corner';
  const collected = 3;
  const total = 10;

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <Text style={[styles.title, { color: '#2F4366' }]}>Card Collections</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image
            source={require('@/assets/images/stampworth-logo.png')}
            style={styles.cardLogo}
            contentFit="contain"
          />
          <View style={styles.cardHeaderText}>
            <Text style={styles.merchantName}>{merchantName}</Text>
            <Text style={styles.cardSubtitle}>Virtual Loyalty Card</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.progressLabel}>Stamps</Text>
            <Text style={styles.progressValue}>
              {collected} / {total}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewStampsButton}
            onPress={() =>
              router.push({
                pathname: '/stamps',
                params: { merchant: merchantName, collected: String(collected), total: String(total) },
              })
            }
          >
            <Text style={styles.viewStampsText}>View stamps</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
    paddingTop: 50,
  },
  card: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#2F4366',
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#5F6368',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF0F2',
    marginVertical: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#5F6368',
  },
  progressValue: {
    marginTop: 2,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#2F4366',
  },
  viewStampsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2F4366',
  },
  viewStampsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
});










