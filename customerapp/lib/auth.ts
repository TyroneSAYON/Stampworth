import { supabase } from '@/lib/supabase';
import { getOrCreateCustomerProfile } from '@/lib/database';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Native Google Sign-In — only available in dev builds, not Expo Go
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    webClientId: '1015682996713-k0c5r661lvnfs2opacvgu3ij7f4fl0pj.apps.googleusercontent.com',
  });
} catch {
  // Not available (Expo Go) — will fall back to web OAuth
}

type SupportedOAuthProvider = 'google' | 'facebook';

// Sign up — checks for existing account first
export const signUp = async (email: string, password: string, fullName: string) => {
  // Try signing in first to detect existing account
  const { data: existingData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInError && existingData.user) {
    // Account exists and password matches — just sign them in
    await getOrCreateCustomerProfile();
    return { data: existingData, error: null };
  }

  // If sign-in failed with "Invalid login credentials", the email might exist with different password
  // or not exist at all. Try to sign up.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) return { data, error };

  // Supabase returns a user with identities=[] if email already exists (email confirmation enabled)
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { data: null, error: new Error('An account with this email already exists. Please sign in instead.') };
  }

  // Try immediate sign-in
  const signInResult = await supabase.auth.signInWithPassword({ email, password });
  if (!signInResult.error && signInResult.data.user) {
    await getOrCreateCustomerProfile();
  } else if (data.user) {
    await getOrCreateCustomerProfile();
  }

  return { data: signInResult.error ? data : signInResult.data, error: signInResult.error };
};

// Sign in
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (!error && data.user) {
    await getOrCreateCustomerProfile();
  }

  return { data, error };
};

// Native Google Sign-In — no browser, near-instant
// Falls back to web OAuth in Expo Go
export const signInWithGoogle = async () => {
  if (!GoogleSignin) {
    // Expo Go fallback — use web OAuth
    return webOAuth('google');
  }
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    const idToken = response.data?.idToken;
    if (!idToken) {
      return { data: null, error: new Error('Google sign-in failed: no ID token returned.') };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) return { data: null, error };
    if (data.user) await getOrCreateCustomerProfile();
    return { data, error: null };
  } catch (err: any) {
    if (err?.code === 'SIGN_IN_CANCELLED') {
      return { data: null, error: new Error('Google sign-in was cancelled.') };
    }
    return { data: null, error: err };
  }
};

// Web-based OAuth flow
const webOAuth = async (provider: SupportedOAuthProvider) => {
  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data?.url) {
    return { data: null, error: error || new Error('Unable to start OAuth sign-in.') };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    return { data: null, error: new Error('OAuth sign-in was cancelled.') };
  }

  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get('code');

  if (code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (exchanged.error) return { data: null, error: exchanged.error };
    if (exchanged.data.user) await getOrCreateCustomerProfile();
    return { data: exchanged.data, error: null };
  }

  const hash = result.url.includes('#') ? result.url.split('#')[1] : '';
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (accessToken && refreshToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) return { data: null, error: sessionError };
    if (sessionData.user) await getOrCreateCustomerProfile();
    return { data: sessionData, error: null };
  }

  return { data: null, error: new Error('OAuth callback did not include a valid session.') };
};

// Public OAuth handler — routes Google to native, others to web
export const signInWithOAuth = async (provider: SupportedOAuthProvider) => {
  if (provider === 'google') return signInWithGoogle();
  return webOAuth(provider);
};

// Sign out
export const signOut = async () => {
  return await supabase.auth.signOut();
};

// Get current user — returns null if session expired
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error?.message?.includes('Refresh Token') || error?.message?.includes('session_not_found')) {
    // Session is dead — clear it
    await supabase.auth.signOut().catch(() => {});
    return null;
  }
  return data.user;
};
