import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Step = 'email' | 'code' | 'newpassword' | 'done';

export default function ForgotPasswordScreen() {
  const { token: deepLinkToken } = useLocalSearchParams<{ token?: string }>();

  const [step, setStep] = useState<Step>(deepLinkToken ? 'newpassword' : 'email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSendReset = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: 'businessapp://forgotpassword',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert(
      'Code Sent',
      'A 8-digit verification code has been sent to your email. Check your inbox (and spam folder).',
      [{ text: 'Enter Code', onPress: () => setStep('code') }],
    );
  };

  const handleVerifyOtp = async () => {
    const code = otp.trim();
    if (code.length < 8) {
      Alert.alert('Invalid Code', 'Please enter the 8-digit code from your email.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'recovery',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Verification Failed', error.message);
      return;
    }

    if (data.session) {
      setStep('newpassword');
    } else {
      Alert.alert('Error', 'Could not verify code. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Too Short', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setStep('done');
  };

  // Done screen
  if (step === 'done') {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.doneTitle}>Password Changed</Text>
          <Text style={styles.doneSubtitle}>Your password has been updated successfully.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/signin')}>
            <Text style={styles.primaryButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => step === 'email' ? router.back() : setStep('email')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#2F4366" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {step === 'email' ? 'Forgot Password' : step === 'code' ? 'Verify Code' : 'New Password'}
          </Text>
        </View>

        {/* Icon */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={step === 'email' ? 'mail-outline' : step === 'code' ? 'shield-checkmark-outline' : 'lock-closed-outline'}
              size={32}
              color="#2F4366"
            />
          </View>
        </View>

        {/* Step: Email */}
        {step === 'email' && (
          <>
            <Text style={styles.description}>
              Enter the email address associated with your business account. We'll send you a verification code to reset your password.
            </Text>

            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color="#B0B8C4" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#C4CAD4"
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSendReset} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? 'Sending...' : 'Send Verification Code'}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step: OTP Code */}
        {step === 'code' && (
          <>
            <Text style={styles.description}>
              Enter the 8-digit code sent to <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
            </Text>

            <Text style={styles.fieldLabel}>VERIFICATION CODE</Text>
            <View style={styles.inputBox}>
              <Ionicons name="keypad-outline" size={18} color="#B0B8C4" />
              <TextInput
                value={otp}
                onChangeText={setOtp}
                style={[styles.input, { letterSpacing: 4, fontSize: 20 }]}
                placeholder="00000000"
                placeholderTextColor="#C4CAD4"
                keyboardType="number-pad"
                maxLength={8}
                autoFocus
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? 'Verifying...' : 'Verify Code'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendRow} onPress={handleSendReset} disabled={loading}>
              <Text style={styles.resendText}>Didn't receive it? <Text style={styles.resendBold}>Resend code</Text></Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step: New Password */}
        {step === 'newpassword' && (
          <>
            <Text style={styles.description}>
              Create a new password for your account. Make sure it's at least 6 characters long.
            </Text>

            <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#B0B8C4" />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#C4CAD4"
                secureTextEntry={!showNew}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}><Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={18} color="#B0B8C4" /></TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#B0B8C4" />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#C4CAD4"
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}><Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color="#B0B8C4" /></TouchableOpacity>
            </View>

            {newPassword.length > 0 && newPassword.length < 6 && (
              <Text style={styles.validationText}>Password must be at least 6 characters</Text>
            )}
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <Text style={styles.validationText}>Passwords do not match</Text>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleChangePassword} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? 'Updating...' : 'Change Password'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 28, paddingTop: 72, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 36 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },

  iconSection: { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8F4FD', alignItems: 'center', justifyContent: 'center' },

  description: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6', lineHeight: 22, marginBottom: 28 },
  emailHighlight: { color: '#2F4366', fontFamily: 'Poppins-SemiBold' },

  fieldLabel: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: '#8A94A6', marginBottom: 8, letterSpacing: 0.5 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E0E4EA', borderRadius: 12, paddingHorizontal: 16, height: 54, marginBottom: 20, gap: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },

  primaryButton: { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2F4366', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', fontFamily: 'Poppins-SemiBold' },

  resendRow: { alignItems: 'center', marginTop: 24 },
  resendText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  resendBold: { color: '#2F4366', fontFamily: 'Poppins-SemiBold' },

  validationText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#E74C3C', marginTop: -12, marginBottom: 12 },

  // Done
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#27AE60', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', marginBottom: 8 },
  doneSubtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6', textAlign: 'center', marginBottom: 36 },
});
