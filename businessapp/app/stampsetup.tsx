import { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, View, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import {
  getCurrentMerchantProfile,
  getMerchantLoyaltyConfiguration,
  saveMerchantStampProgramConfiguration,
} from '@/lib/database';

export default function StampSetupScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [numberOfStamps, setNumberOfStamps] = useState('10');
  const [reward, setReward] = useState('');
  const [conditions, setConditions] = useState('Buy 10 coffees and get your 11th coffee free.');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadStampSetup = async () => {
      setLoading(true);

      const { data: merchant, error: merchantError } = await getCurrentMerchantProfile();
      if (merchantError || !merchant) {
        setLoading(false);
        const errorMessage = merchantError?.message || '';
        if (errorMessage === 'AUTH_SESSION_MISSING') {
          Alert.alert('Session expired', 'Please sign in again.');
          router.replace('/signin');
          return;
        }

        Alert.alert('Merchant account not found', errorMessage || 'Please sign in with your business account.');
        return;
      }

      const { data: settings } = await getMerchantLoyaltyConfiguration();
      if (settings) {
        setNumberOfStamps(String(settings.stamps_per_redemption || 10));
        setReward(settings.redemption_reward_description || '');
        setConditions(settings.promotion_text || '');
      }

      setLoading(false);
    };

    loadStampSetup();
  }, []);

  const handleSave = async () => {
    if (!numberOfStamps || parseInt(numberOfStamps, 10) < 1) {
      Alert.alert('Invalid Input', 'Please enter a valid number of stamps (minimum 1).');
      return;
    }

    if (!reward.trim()) {
      Alert.alert('Required Field', 'Please enter a reward.');
      return;
    }

    setSaving(true);
    const { error } = await saveMerchantStampProgramConfiguration({
      stampsPerRedemption: parseInt(numberOfStamps, 10),
      rewardDescription: reward,
      conditions,
    });
    setSaving(false);

    if (error) {
      if (error.message === 'AUTH_SESSION_MISSING') {
        Alert.alert('Session expired', 'Please sign in again.');
        router.replace('/signin');
        return;
      }

      Alert.alert('Failed to save stamp setup', error.message);
      return;
    }

    Alert.alert('Saved', 'Stamp setup has been saved.', [
      {
        text: 'Go to Scan',
        onPress: () => router.push('/(tabs)/scan'),
      },
    ]);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading stamp setup...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: '#2F4366' }]}>Stamp Setup</Text>
          </View>

          <Text style={[styles.subtitle, { color: theme.icon }]}>Configure stamp count, reward, and redemption conditions</Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Number of Stamps *</Text>
            <View style={[styles.inputContainer, { borderColor: theme.icon }]}> 
              <Ionicons name="calculator-outline" size={20} color={theme.icon} style={styles.inputIcon} />
              <TextInput
                value={numberOfStamps}
                onChangeText={setNumberOfStamps}
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter total stamps required"
                placeholderTextColor={theme.icon}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Reward *</Text>
            <View style={[styles.inputContainer, { borderColor: theme.icon }]}> 
              <Ionicons name="gift-outline" size={20} color={theme.icon} style={styles.inputIcon} />
              <TextInput
                value={reward}
                onChangeText={setReward}
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g., Free coffee, 10% discount"
                placeholderTextColor={theme.icon}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Conditions and Redemptions</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer, { borderColor: theme.icon }]}> 
              <Ionicons name="document-text-outline" size={20} color={theme.icon} style={styles.inputIcon} />
              <TextInput
                value={conditions}
                onChangeText={setConditions}
                style={[styles.input, styles.textArea, { color: theme.text }]}
                placeholder="Describe earning and redemption conditions..."
                placeholderTextColor={theme.icon}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#2F4366' }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Configuration'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  header: {
    marginBottom: 8,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  textAreaContainer: {
    minHeight: 120,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    minHeight: 20,
  },
  textArea: {
    minHeight: 80,
  },
  saveButton: {
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
});
