import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signIn, signInWithOAuth } from '@/lib/auth';
import { isMerchantSetupComplete } from '@/lib/database';
import { GoogleLogo } from '@/components/google-logo';

export default function SignInScreen() {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const handleSignIn = async () => {
    if (!businessName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your business name, email, and password.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    if (error) { setLoading(false); Alert.alert('Sign in failed', error.message); return; }
    const { complete } = await isMerchantSetupComplete();
    setLoading(false);
    router.replace(complete ? '/(tabs)' : '/storesetup');
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    const { error } = await signInWithOAuth(provider);
    if (error) { setSocialLoading(null); Alert.alert(`${provider} sign in failed`, error.message); return; }
    const { complete } = await isMerchantSetupComplete();
    setSocialLoading(null);
    router.replace(complete ? '/(tabs)' : '/storesetup');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Sign In</Text>

        <View style={styles.logoSection}>
          <Image source={require('@/assets/images/stampworthb-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brand}>Stampworth Business</Text>
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="business-outline" size={18} color="#B0B8C4" />
          <TextInput value={businessName} onChangeText={setBusinessName} style={styles.input} placeholder="Business name" placeholderTextColor="#C4CAD4" autoCapitalize="words" />
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="mail-outline" size={18} color="#B0B8C4" />
          <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" placeholderTextColor="#C4CAD4" keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="lock-closed-outline" size={18} color="#B0B8C4" />
          <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholder="Password" placeholderTextColor="#C4CAD4" secureTextEntry />
        </View>

        <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/forgotpassword')}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/createaccount')}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Create one</Text></Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleOAuth('facebook')} disabled={loading || socialLoading !== null}>
            <Ionicons name="logo-facebook" size={32} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleOAuth('google')} disabled={loading || socialLoading !== null}>
            <GoogleLogo size={32} />
          </TouchableOpacity>
        </View>
        {socialLoading && <Text style={styles.socialLoadingText}>Signing in with {socialLoading}...</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 28, paddingTop: 72, paddingBottom: 48 },

  title: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', marginBottom: 48 },

  logoSection: { alignItems: 'center', marginBottom: 48 },
  logo: { width: 56, height: 56, marginBottom: 16 },
  brand: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  tagline: { fontSize: 13, color: '#8A94A6', fontFamily: 'Poppins-Regular', marginTop: 4 },

  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E0E4EA', borderRadius: 12, paddingHorizontal: 16, height: 54, marginBottom: 14, gap: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 28 },
  forgotText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#2F4366' },

  primaryButton: { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2F4366', marginBottom: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', fontFamily: 'Poppins-SemiBold' },

  linkRow: { alignItems: 'center', marginBottom: 32 },
  linkText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
  linkBold: { color: '#2F4366', fontFamily: 'Poppins-SemiBold' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E4EA' },
  dividerText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#C4CAD4' },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  socialButton: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  socialLoadingText: { textAlign: 'center', marginTop: 16, fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6' },
});
