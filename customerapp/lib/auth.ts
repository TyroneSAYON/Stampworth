import { supabase } from '@/lib/supabase';
import { getOrCreateCustomerProfile } from '@/lib/database';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

type SupportedOAuthProvider = 'google' | 'facebook';

// Sign up
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) return { data, error };

  // Try immediate sign-in (works when email confirmation is disabled)
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

export const signInWithOAuth = async (provider: SupportedOAuthProvider) => {
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

// Sign out
export const signOut = async () => {
  return await supabase.auth.signOut();
};

// Get current user
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};
