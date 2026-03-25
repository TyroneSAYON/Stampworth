import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getCurrentUser, signOut } from '@/lib/auth';
import { getOrCreateCustomerProfile } from '@/lib/database';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        const user = await getCurrentUser();
        if (!user) { setLoading(false); router.replace('/signin'); return; }
        const { data: customer } = await getOrCreateCustomerProfile();
        if (cancelled) return;
        setAuthUserId(user.id);
        setEmail(user.email || customer?.email || '');
        setUsername(customer?.full_name || customer?.username || user.user_metadata?.full_name as string || user.email?.split('@')[0] || 'Customer');
        setPhotoUri(customer?.avatar_url || user.user_metadata?.avatar_url as string || null);
        setLoading(false);
      };
      load();
      return () => { cancelled = true; };
    }, [])
  );

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!authUserId || uri.startsWith('http')) return uri;
    const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() === 'png' ? 'png' : 'jpg';
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const filePath = `${authUserId}/avatar.${ext}`;
    const response = await fetch(uri);
    const fileData = await response.arrayBuffer();
    const { error } = await supabase.storage.from('customer-avatars').upload(filePath, fileData, { contentType, upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('customer-avatars').getPublicUrl(filePath);
    return `${publicUrl}?v=${Date.now()}`;
  };

  const handleSave = async () => {
    if (!authUserId) return;
    setSaving(true);
    let uploadedUrl = photoUri;
    if (photoUri) {
      try { uploadedUrl = await uploadAvatar(photoUri); } catch (e: any) {
        Alert.alert('Upload failed', e?.message || 'Could not upload photo.');
        setSaving(false); return;
      }
    }
    const updateFields: Record<string, any> = { full_name: username.trim(), avatar_url: uploadedUrl };
    const newEmail = email.trim().toLowerCase();
    if (newEmail) updateFields.email = newEmail;

    const { error } = await supabase.from('customers').update(updateFields).eq('auth_id', authUserId);
    setSaving(false);
    if (error) { Alert.alert('Update failed', error.message); return; }

    // Update Supabase Auth email if changed
    const user = await getCurrentUser();
    if (user && newEmail && newEmail !== user.email) {
      await supabase.auth.updateUser({ email: newEmail });
    }

    setPhotoUri(uploadedUrl || null);
    Alert.alert('Saved', 'Profile updated successfully.');
  };

  const handleSignOut = async () => { await signOut(); router.replace('/signin'); };

  const handleDelete = () => {
    Alert.alert('Delete account', 'This will permanently delete your account. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeletingAccount(true);
        const { error } = await supabase.rpc('delete_my_customer_account');
        if (error) { Alert.alert('Delete failed', error.message); setDeletingAccount(false); return; }
        await signOut();
        setDeletingAccount(false);
        Alert.alert('Deleted', 'Your account was removed.', [{ text: 'OK', onPress: () => router.replace('/signin') }]);
      }},
    ]);
  };

  if (loading) {
    return <View style={styles.container}><View style={styles.center}><ActivityIndicator size="large" color="#2F4366" /></View></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: '#F6F8FB' }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('@/assets/images/stampworth-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>Stampworth</Text>
        </View>

        <Text style={styles.pageTitle}>Account</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}><Ionicons name="person" size={28} color="#C4CAD4" /></View>
            )}
            <View style={styles.avatarBadge}><Ionicons name="camera" size={12} color="#FFFFFF" /></View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{username}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>

        {/* Edit fields */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.inputBox}>
          <Ionicons name="person-outline" size={18} color="#B0B8C4" />
          <TextInput value={username} onChangeText={setUsername} style={styles.input} placeholder="Name" placeholderTextColor="#C4CAD4" />
        </View>
        <View style={styles.inputBox}>
          <Ionicons name="mail-outline" size={18} color="#B0B8C4" />
          <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" placeholderTextColor="#C4CAD4" keyboardType="email-address" autoCapitalize="none" />
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>

        {/* Links */}
        <Text style={styles.sectionTitle}>More</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/terms')}>
          <Ionicons name="document-text-outline" size={18} color="#2F4366" />
          <Text style={styles.menuText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color="#C4CAD4" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/policy')}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#2F4366" />
          <Text style={styles.menuText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color="#C4CAD4" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleDelete} disabled={deletingAccount}>
          <Ionicons name="trash-outline" size={18} color="#E74C3C" />
          <Text style={[styles.menuText, { color: '#E74C3C' }]}>{deletingAccount ? 'Deleting...' : 'Delete Account'}</Text>
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold' },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#2F4366', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 24, marginTop: 20, marginBottom: 20 },

  profileCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  avatarContainer: { width: 72, height: 72, marginBottom: 14, position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#2F4366', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  profileName: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: '#1A1A2E' },
  profileEmail: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#8A94A6', marginTop: 2 },

  sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#2F4366', paddingHorizontal: 24, marginBottom: 12 },
  inputBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E4EA', borderRadius: 12, paddingHorizontal: 16, height: 54, marginBottom: 12, gap: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1A1A2E', padding: 0 },
  primaryButton: { marginHorizontal: 24, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2F4366', marginBottom: 28 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', fontFamily: 'Poppins-SemiBold' },

  menuItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8, gap: 12 },
  menuText: { flex: 1, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1A1A2E' },

  signOutButton: { marginHorizontal: 24, marginTop: 20, backgroundColor: '#E74C3C', borderRadius: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  signOutText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
});
