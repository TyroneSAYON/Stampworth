import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AccountScreen() {
  const colorScheme = useColorScheme();
  const theme = useMemo(() => Colors[colorScheme ?? 'light'], [colorScheme]);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [username, setUsername] = useState('Andrei');
  const [email, setEmail] = useState('andrei@email.com');

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
            onChangeText={setEmail}
            style={[styles.input, { color: theme.text }]}
            placeholder="Update email"
            placeholderTextColor={theme.icon}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => Alert.alert('Profile updated', 'Your name and email have been updated.')}
        >
          <Text style={styles.confirmButtonText}>Confirm changes</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#2F4366' }]}>More</Text>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => Alert.alert('Announcement', 'No announcements right now.')}
        >
          <Text style={[styles.actionText, { color: theme.text }]}>Announcement</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.icon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            Alert.alert('Delete account', 'Are you sure you want to delete your account?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive' },
            ])
          }
        >
          <Text style={[styles.actionText, { color: '#C0392B' }]}>Delete Account</Text>
          <Ionicons name="trash-outline" size={18} color="#C0392B" />
        </TouchableOpacity>
      </View>

      {/* Links */}
      <View style={styles.linksRow}>
        <TouchableOpacity onPress={() => router.push('/terms')}>
          <Text style={[styles.linkText, { color: '#2F4366' }]}>Terms of service</Text>
        </TouchableOpacity>
        <Text style={[styles.linkDivider, { color: theme.icon }]}>•</Text>
        <TouchableOpacity onPress={() => router.push('/policy')}>
          <Text style={[styles.linkText, { color: '#2F4366' }]}>Policy</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={() => router.replace('/signin')}>
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
  linksRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  linkText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    textDecorationLine: 'underline',
  },
  linkDivider: {
    fontSize: 12,
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










