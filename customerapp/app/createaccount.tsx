import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { signUp, signInWithOAuth } from '@/lib/auth';
import { GoogleLogo } from '@/components/google-logo';

WebBrowser.maybeCompleteAuthSession();

export default function CreateAccountScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const handleCreate = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) { Alert.alert('Missing fields', 'Please complete all fields.'); return; }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, username.trim());
    setLoading(false);
    if (error) { Alert.alert('Sign up failed', error.message); return; }
    router.replace('/(tabs)/qrcode');
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    const { error } = await signInWithOAuth(provider);
    setSocialLoading(null);
    if (error) { Alert.alert(`${provider} sign up failed`, error.message); return; }
    router.replace('/(tabs)/qrcode');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#2F4366" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
        </View>

        <View style={styles.logoSection}>
          <Image source={require('@/assets/images/stampworth-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brand}>Stampworth</Text>
          <Text style={styles.tagline}>Your Virtual Loyalty Card</Text>
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="person-outline" size={18} color="#B0B8C4" />
          <TextInput value={username} onChangeText={setUsername} style={styles.input} placeholder="Username" placeholderTextColor="#C4CAD4" autoCapitalize="none" />
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="mail-outline" size={18} color="#B0B8C4" />
          <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" placeholderTextColor="#C4CAD4" keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="lock-closed-outline" size={18} color="#B0B8C4" />
          <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholder="Password" placeholderTextColor="#C4CAD4" secureTextEntry={!showPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#B0B8C4" /></TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/signin')}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
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
        {socialLoading && <Text style={styles.socialLoadingText}>Creating account with {socialLoading}...</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 28, paddingTop: 72, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 48 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 56, height: 56, marginBottom: 16 },
  brand: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  tagline: { fontSize: 13, color: '#8A94A6', fontFamily: 'Poppins-Regular', marginTop: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E0E4EA', borderRadius: 12, paddingHorizontal: 16, height: 54, marginBottom: 14, gap: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },
  primaryButton: { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2F4366', marginTop: 14, marginBottom: 16 },
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
