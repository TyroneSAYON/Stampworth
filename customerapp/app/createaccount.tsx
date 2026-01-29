import { Image } from 'expo-image';
import { StyleSheet, View, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function CreateAccountScreen() {
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#2F4366" />
          </TouchableOpacity>
          <Text style={[styles.title, { color: '#2F4366' }]}>
            Create Account
          </Text>
        </View>

        {/* Logo and Brand */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/stampworth-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text
            style={[
              styles.brandName,
              {
                color: '#2F4366',
                fontWeight: 'bold',
                letterSpacing: 1,
                textShadowColor: 'rgba(0,0,0,0.2)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 4,
              },
            ]}
          >
            Stampworth
          </Text>
          <Text style={[styles.tagline, { color: '#2F4366' }]}>
            Your Virtual Loyalty Card
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={[styles.inputContainer, { borderColor: Colors[colorScheme ?? 'light'].icon }]}>
            <Ionicons name="person-outline" size={20} color={Colors[colorScheme ?? 'light'].icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: Colors[colorScheme ?? 'light'].text }]}
              placeholder="Enter username"
              placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, { borderColor: Colors[colorScheme ?? 'light'].icon }]}>
            <Ionicons name="mail-outline" size={20} color={Colors[colorScheme ?? 'light'].icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: Colors[colorScheme ?? 'light'].text }]}
              placeholder="Enter email"
              placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, { borderColor: Colors[colorScheme ?? 'light'].icon }]}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors[colorScheme ?? 'light'].icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: Colors[colorScheme ?? 'light'].text }]}
              placeholder="Set up password"
              placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/loading')}
          >
            <Text style={styles.buttonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signInLink}
            onPress={() => router.push('/signin')}
          >
            <Text style={[styles.signInLinkText, { color: '#2F4366' }]}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Social Sign Up */}
        <View style={styles.socialSection}>
          <Text style={[styles.socialText, { color: '#2F4366' }]}>
            or sign up with
          </Text>
          <View style={styles.socialButtons}>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5' }]}>
              <Ionicons name="logo-facebook" size={28} color="#1877F2" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5' }]}>
              <Ionicons name="logo-google" size={28} color="#DB4437" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5' }]}>
              <Ionicons name="logo-apple" size={28} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 80,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 40,
    height: 40,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  button: {
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    backgroundColor: '#2F4366',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  signInLink: {
    alignItems: 'center',
  },
  signInLinkText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  socialSection: {
    alignItems: 'center',
  },
  socialText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginBottom: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

