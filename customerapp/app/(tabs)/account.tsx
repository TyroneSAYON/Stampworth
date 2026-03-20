import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentUser, signOut } from '@/lib/auth';
import { getOrCreateCustomerProfile } from '@/lib/database';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const colorScheme = useColorScheme();
  const theme = useMemo(() => Colors[colorScheme ?? 'light'], [colorScheme]);
  const avatarBucket = 'customer-avatars';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadAccount = async () => {
      setLoading(true);

      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        router.replace('/signin');
        return;
      }

      const { data: customer } = await getOrCreateCustomerProfile();

      setAuthUserId(user.id);
      setEmail(user.email || customer?.email || '');
      setUsername(
        customer?.full_name ||
          customer?.username ||
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split('@')[0] ||
          'Customer',
      );
      setPhotoUri(customer?.avatar_url || (user.user_metadata?.avatar_url as string | undefined) || null);

      setLoading(false);
    };

    loadAccount();
  }, []);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to upload a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadAvatarIfNeeded = async (uri: string) => {
    if (!authUserId || uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }

    const fileExtension = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const normalizedExtension = fileExtension === 'png' ? 'png' : 'jpg';
    const contentType = normalizedExtension === 'png' ? 'image/png' : 'image/jpeg';
    const filePath = `${authUserId}/avatar.${normalizedExtension}`;

    const response = await fetch(uri);
    const fileData = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage.from(avatarBucket).upload(filePath, fileData, {
      contentType,
      upsert: true,
    });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(avatarBucket).getPublicUrl(filePath);

    return `${publicUrl}?v=${Date.now()}`;
  };

  const handleSaveProfile = async () => {
    if (!authUserId) {
      Alert.alert('Profile unavailable', 'Please sign in again.');
      return;
    }

    setSaving(true);

    let uploadedPhotoUrl = photoUri;
    if (photoUri) {
      try {
        uploadedPhotoUrl = await uploadAvatarIfNeeded(photoUri);
      } catch (error: any) {
        const hint =
          typeof error?.message === 'string' && error.message.toLowerCase().includes('bucket')
            ? ' Create a public storage bucket named customer-avatars in Supabase first.'
            : '';
        Alert.alert('Photo upload failed', `${error?.message || 'Could not upload image.'}${hint}`);
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from('customers')
      .update({
        full_name: username.trim(),
        avatar_url: uploadedPhotoUrl,
      })
      .eq('auth_id', authUserId);

    if (error) {
      Alert.alert('Update failed', error.message);
      setSaving(false);
      return;
    }

    setPhotoUri(uploadedPhotoUrl || null);
    setSaving(false);

    Alert.alert('Profile updated', 'Your account center now reflects your latest profile details.');
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  const executeDeleteAccount = async () => {
    if (deletingAccount) {
      return;
    }

    setDeletingAccount(true);

    const { error } = await supabase.rpc('delete_my_customer_account');

    if (error) {
      Alert.alert('Delete failed', error.message);
      setDeletingAccount(false);
      return;
    }

    await signOut();
    setDeletingAccount(false);

    Alert.alert('Account deleted', 'Your account and related customer data were permanently removed.', [
      {
        text: 'OK',
        onPress: () => router.replace('/signin'),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete account', 'This will permanently delete your account and related data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: executeDeleteAccount },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.background }]}> 
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2F4366" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading account...</Text>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/stampworth-logo.png')}
          style={styles.headerLogo}
          contentFit="contain"
        />
        <Text style={[styles.title, { color: '#2F4366' }]}>Account Center</Text>
      </View>

      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatarPlaceholder, { borderColor: theme.icon }]}>
                <Ionicons name="person" size={28} color={theme.icon} />
              </View>
            )}
            <TouchableOpacity style={styles.avatarEdit} onPress={pickPhoto}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: theme.text }]}>{username}</Text>
            <Text style={[styles.profileEmail, { color: theme.icon }]}>{email}</Text>
          </View>
        </View>
      </View>

      {/* Editable fields */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>Profile</Text>

        <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
          <Ionicons name="person-outline" size={18} color={theme.icon} style={styles.inputIcon} />
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={[styles.input, { color: theme.text }]}
            placeholder="Update username"
            placeholderTextColor={theme.icon}
          />
        </View>

        <View style={[styles.inputContainer, { borderColor: theme.icon }]}>
          <Ionicons name="mail-outline" size={18} color={theme.icon} style={styles.inputIcon} />
          <TextInput
            value={email}
            style={[styles.input, { color: theme.text }]}
            placeholder="Email"
            placeholderTextColor={theme.icon}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={false}
          />
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          <Text style={styles.confirmButtonText}>{saving ? 'Saving...' : 'Confirm changes'}</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>More</Text>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/terms')}
        >
          <Text style={[styles.actionText, { color: theme.text }]}>Terms of service</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.icon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/policy')}
        >
          <Text style={[styles.actionText, { color: theme.text }]}>Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.icon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
        >
          <Text style={[styles.actionText, { color: '#C0392B' }]}>{deletingAccount ? 'Deleting account...' : 'Delete Account'}</Text>
          <Ionicons name="trash-outline" size={18} color="#C0392B" />
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: 16,
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 0,
  },
  profileCard: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 68,
    height: 68,
    marginRight: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2F4366',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  confirmButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#2F4366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  signOutButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#FDEDEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: '#C0392B',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
});










