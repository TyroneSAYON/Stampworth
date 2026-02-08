import { Image } from 'expo-image';
import { StyleSheet, View, useColorScheme, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function SignInScreen() {
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={[styles.title, { color: '#2F4366' }]}>
          Sign In
        </Text>

        {/* Logo and Brand */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/stampworthb-logo.png')}
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
            Stampworth Business
          </Text>
          <Text style={[styles.tagline, { color: '#2F4366' }]}>
            Loyalty Card Business Admin
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
              placeholder="Password"
              placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: '#2F4366' }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/storesetup')}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.createAccount}
            onPress={() => router.push('/createaccount')}
          >
            <Text style={[styles.createAccountText, { color: '#2F4366' }]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Social Sign In */}
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
  title: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 80,
    alignSelf: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 80,
    height: 80,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  button: {
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#2F4366',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  createAccount: {
    alignItems: 'center',
  },
  createAccountText: {
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

