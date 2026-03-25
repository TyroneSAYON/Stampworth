import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

type Params = {
  merchant?: string;
  collected?: string;
  total?: string;
  color?: string;
};

export default function StampsScreen() {
  const { merchant, collected, total, color } = useLocalSearchParams<Params>();

  const merchantName = merchant ?? 'Merchant';
  const collectedCount = Number(collected ?? 0);
  const totalCount = Number(total ?? 10);
  const cardColor = color || '#2F4366';

  const slots = useMemo(() => {
    const safeTotal = Number.isFinite(totalCount) && totalCount > 0 ? totalCount : 10;
    const safeCollected = Number.isFinite(collectedCount) ? Math.min(Math.max(collectedCount, 0), safeTotal) : 0;
    return Array.from({ length: safeTotal }, (_, i) => ({
      id: i,
      filled: i < safeCollected,
      isFree: i === safeTotal - 1,
    }));
  }, [collectedCount, totalCount]);

  const pct = totalCount > 0 ? Math.min(100, (collectedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#2F4366" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Stamps</Text>
            <Text style={styles.subtitle}>{merchantName}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{collectedCount} / {totalCount}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: cardColor }]} />
          </View>
          {collectedCount >= totalCount && (
            <View style={[styles.freeBanner, { backgroundColor: cardColor }]}>
              <Ionicons name="gift" size={16} color="#FFFFFF" />
              <Text style={styles.freeText}>FREE REDEMPTION AVAILABLE</Text>
            </View>
          )}
        </View>

        {/* Stamp grid */}
        <View style={styles.grid}>
          {slots.map((slot) => (
            <View
              key={slot.id}
              style={[
                styles.stampSlot,
                slot.isFree
                  ? { borderColor: cardColor, borderWidth: 2, backgroundColor: `${cardColor}10` }
                  : slot.filled
                    ? { borderColor: cardColor, backgroundColor: `${cardColor}18` }
                    : { borderColor: '#E0E4EA', backgroundColor: '#F8F9FB' },
              ]}
            >
              {slot.isFree
                ? <Text style={[styles.freeLabel, { color: cardColor }]}>FREE</Text>
                : slot.filled
                  ? <Ionicons name="checkmark" size={20} color={cardColor} />
                  : <Text style={styles.slotNumber}>{slot.id + 1}</Text>}
            </View>
          ))}
        </View>

        <Text style={styles.helper}>Collect stamps every time you purchase from this merchant.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },
  scroll: { paddingHorizontal: 28, paddingTop: 64, paddingBottom: 48 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  subtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 2 },

  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 28 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressLabel: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  progressValue: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  progressBar: { height: 8, backgroundColor: '#F0F2F5', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  freeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, borderRadius: 10, paddingVertical: 10 },
  freeText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF', letterSpacing: 0.5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  stampSlot: { width: 56, height: 56, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  slotNumber: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },
  freeLabel: { fontSize: 9, fontFamily: 'Poppins-SemiBold' },

  helper: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center' },
});
