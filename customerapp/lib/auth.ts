import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

type SupportedOAuthProvider = 'google' | 'facebook';

const ensureUniqueUsername = async (base: string) => {
  const normalizedBase = (base || 'customer').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'customer';

  for (let index = 0; index < 8; index += 1) {
    const candidate = index === 0 ? normalizedBase : `${normalizedBase}${Math.floor(Math.random() * 9999)}`;
    const { data } = await supabase.from('customers').select('id').eq('username', candidate).maybeSingle();
    if (!data) {
      return candidate;
    }
  }

  return `${normalizedBase}${Date.now().toString().slice(-5)}`;
};

const ensureCustomerProfile = async (authUser: any, preferredName?: string) => {
  const existing = await supabase.from('customers').select('*').eq('auth_id', authUser.id).maybeSingle();

  if (existing.data) {
    return { data: existing.data, error: null };
  }

  const email = authUser.email || '';
  const localPart = email.split('@')[0] || preferredName || 'customer';
  const username = await ensureUniqueUsername(localPart);

  const displayName =
    preferredName ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    localPart;

  const { data, error } = await supabase
    .from('customers')
    .upsert(
      {
        auth_id: authUser.id,
        email,
        username,
        full_name: displayName,
        avatar_url: authUser.user_metadata?.avatar_url || null,
      },
      { onConflict: 'auth_id' },
    )
    .select('*')
    .single();

  return { data, error };
};

// Sign up
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { data, error };
  }

  if (data.user) {
    await ensureCustomerProfile(data.user, fullName);
  }

  // Try immediate sign-in so account can be used right away when email confirmation is disabled.
  const signInResult = await supabase.auth.signInWithPassword({ email, password });
  if (!signInResult.error && signInResult.data.user) {
    await ensureCustomerProfile(signInResult.data.user, fullName);
  }

  return { data: signInResult.error ? data : signInResult.data, error: signInResult.error };
};

// Sign in
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.user) {
    await ensureCustomerProfile(data.user);
  }

  return { data, error };
};

export const signInWithOAuth = async (provider: SupportedOAuthProvider) => {
  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
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
    if (exchanged.error) {
      return { data: null, error: exchanged.error };
    }

    if (exchanged.data.user) {
      await ensureCustomerProfile(exchanged.data.user);
    }

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

    if (sessionError) {
      return { data: null, error: sessionError };
    }

    if (sessionData.user) {
      await ensureCustomerProfile(sessionData.user);
    }

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
