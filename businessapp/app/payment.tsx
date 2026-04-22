import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { PLANS, subscribe, PlanId } from '@/lib/subscription';

export default function PaymentScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const plan = PLANS[(planId as PlanId) || 'starter'];

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'gcash' | 'maya'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);

  const formatCardNumber = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 4);
    if (clean.length > 2) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return clean;
  };

  const handlePay = async () => {
    if (paymentMethod === 'card') {
      if (!cardNumber.replace(/\s/g, '') || !cardExpiry || !cardCvc || !cardName.trim()) {
        Alert.alert('Missing fields', 'Please fill in all card details.'); return;
      }
    }

    setProcessing(true);

    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 1500));

    const methodLabel = paymentMethod === 'card' ? 'sandbox_card' : paymentMethod === 'gcash' ? 'sandbox_gcash' : 'sandbox_maya';
    await subscribe(plan.id, methodLabel);

    setProcessing(false);
    Alert.alert(
      'Payment Successful! 🎉',
      `You're now on the ${plan.name} plan.\n\nThis is a sandbox payment — no real money was charged.\n\nYour plan is active for 30 days.`,
      [{ text: 'Go to Dashboard', onPress: () => router.back() }]
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#2F4366" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscribe</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Sandbox notice */}
        <View style={styles.sandboxBanner}>
          <Ionicons name="flask" size={16} color="#E67E22" />
          <Text style={styles.sandboxText}>Sandbox Mode — No real charges</Text>
        </View>

        {/* Plan summary */}
        <View style={styles.planSummary}>
          <Text style={styles.planName}>{plan.name} Plan</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>₱{plan.price}</Text>
            <Text style={styles.pricePeriod}>/month</Text>
          </View>
        </View>

        {/* Payment method tabs */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.methodRow}>
          {([['card', 'card-outline', 'Card'], ['gcash', 'phone-portrait-outline', 'GCash'], ['maya', 'wallet-outline', 'Maya']] as const).map(([id, icon, label]) => (
            <TouchableOpacity key={id} style={[styles.methodTab, paymentMethod === id && styles.methodTabActive]} onPress={() => setPaymentMethod(id)}>
              <Ionicons name={icon} size={18} color={paymentMethod === id ? '#2F4366' : '#8A94A6'} />
              <Text style={[styles.methodLabel, paymentMethod === id && styles.methodLabelActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Card form */}
        {paymentMethod === 'card' ? (
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Card Number</Text>
            <View style={styles.inputBox}>
              <Ionicons name="card-outline" size={18} color="#B0B8C4" />
              <TextInput value={cardNumber} onChangeText={(t) => setCardNumber(formatCardNumber(t))} style={styles.input} placeholder="4242 4242 4242 4242" placeholderTextColor="#C4CAD4" keyboardType="number-pad" maxLength={19} />
            </View>

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Expiry</Text>
                <View style={styles.inputBox}>
                  <TextInput value={cardExpiry} onChangeText={(t) => setCardExpiry(formatExpiry(t))} style={styles.input} placeholder="MM/YY" placeholderTextColor="#C4CAD4" keyboardType="number-pad" maxLength={5} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CVC</Text>
                <View style={styles.inputBox}>
                  <TextInput value={cardCvc} onChangeText={(t) => setCardCvc(t.replace(/\D/g, '').slice(0, 3))} style={styles.input} placeholder="123" placeholderTextColor="#C4CAD4" keyboardType="number-pad" maxLength={3} secureTextEntry />
                </View>
              </View>
            </View>

            <Text style={styles.inputLabel}>Cardholder Name</Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={18} color="#B0B8C4" />
              <TextInput value={cardName} onChangeText={setCardName} style={styles.input} placeholder="Juan Dela Cruz" placeholderTextColor="#C4CAD4" autoCapitalize="words" />
            </View>

            <Text style={styles.testHint}>Use test card: 4242 4242 4242 4242, any expiry/CVC</Text>
          </View>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.ewalletInfo}>
              <Ionicons name={paymentMethod === 'gcash' ? 'phone-portrait' : 'wallet'} size={36} color="#2F4366" />
              <Text style={styles.ewalletTitle}>{paymentMethod === 'gcash' ? 'GCash' : 'Maya'} Sandbox</Text>
              <Text style={styles.ewalletDesc}>Tap "Pay" to simulate a {paymentMethod === 'gcash' ? 'GCash' : 'Maya'} payment. No real account needed.</Text>
            </View>
          </View>
        )}

        {/* Pay button */}
        <TouchableOpacity style={styles.payButton} onPress={handlePay} disabled={processing}>
          <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
          <Text style={styles.payButtonText}>{processing ? 'Processing...' : `Pay ₱${plan.price}/month`}</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>This is a sandbox environment. No real money will be charged. Your subscription will activate immediately and last for 30 days.</Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },
  scroll: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', textAlign: 'center' },

  sandboxBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF4E6', borderRadius: 10, paddingVertical: 8, marginBottom: 20 },
  sandboxText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#E67E22' },

  planSummary: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 },
  planName: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  priceAmount: { fontSize: 32, fontFamily: 'Poppins-SemiBold', color: '#2F4366' },
  pricePeriod: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6' },

  sectionTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#2F4366', marginBottom: 10 },

  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  methodTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, borderWidth: 1.5, borderColor: '#E0E4EA' },
  methodTabActive: { borderColor: '#2F4366', backgroundColor: '#EDF4FF' },
  methodLabel: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#8A94A6' },
  methodLabelActive: { color: '#2F4366' },

  formCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 20 },
  inputLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E0E4EA', borderRadius: 10, paddingHorizontal: 14, height: 48, marginBottom: 14, gap: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },
  inputRow: { flexDirection: 'row', gap: 12 },
  testHint: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#B0B8C4', textAlign: 'center', marginTop: 4 },

  ewalletInfo: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  ewalletTitle: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  ewalletDesc: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center' },

  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14, backgroundColor: '#2F4366', marginBottom: 16 },
  payButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins-SemiBold' },

  disclaimer: { fontSize: 10, fontFamily: 'Poppins-Regular', color: '#B0B8C4', textAlign: 'center', lineHeight: 16 },
});
