import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Params = {
  merchant?: string;
  collected?: string;
  total?: string;
};

export default function StampsScreen() {
  const colorScheme = useColorScheme();
  const { merchant, collected, total } = useLocalSearchParams<Params>();

  const merchantName = merchant ?? 'Merchant';
  const collectedCount = Number(collected ?? 3);
  const totalCount = Number(total ?? 10);

  const slots = useMemo(() => {
    const safeTotal = Number.isFinite(totalCount) && totalCount > 0 ? totalCount : 10;
    const safeCollected = Number.isFinite(collectedCount) ? Math.min(Math.max(collectedCount, 0), safeTotal) : 0;
    return { safeCollected, safeTotal };
  }, [collectedCount, totalCount]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2F4366" />
        </TouchableOpacity>
        <Text style={[styles.title, { color: '#2F4366' }]}>Stamps</Text>
      </View>

      <Text style={[styles.merchant, { color: Colors[colorScheme ?? 'light'].text }]}>
        {merchantName}
      </Text>
      <Text style={[styles.progress, { color: Colors[colorScheme ?? 'light'].icon }]}>
        {slots.safeCollected} / {slots.safeTotal} collected
      </Text>

      <View style={styles.grid}>
        {Array.from({ length: slots.safeTotal }).map((_, idx) => {
          const filled = idx < slots.safeCollected;
          return (
            <View
              key={idx}
              style={[
                styles.stampSlot,
                {
                  borderColor: filled ? '#2F4366' : Colors[colorScheme ?? 'light'].icon,
                  backgroundColor: filled ? 'rgba(47,67,102,0.12)' : 'transparent',
                },
              ]}
            >
              {filled ? <Ionicons name="checkmark" size={18} color="#2F4366" /> : null}
            </View>
          );
        })}
      </View>

      <Text style={[styles.helper, { color: Colors[colorScheme ?? 'light'].icon }]}>
        Collect stamps every time you purchase from this merchant.
      </Text>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
  },
  merchant: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  progress: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  stampSlot: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
});


