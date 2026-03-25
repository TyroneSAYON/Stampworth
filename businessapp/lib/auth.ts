import { supabase } from '@/lib/supabase';
import { ensureCurrentMerchantProfile, recordMerchantLogin, saveMerchantAccountInput } from '@/lib/database';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

type SupportedOAuthProvider = 'google' | 'facebook';
const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const BACKEND_TIMEOUT_MS = 10000;
const SKIP_AUTH_MODE = process.env.EXPO_PUBLIC_SKIP_AUTH === 'true';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const signInWithRetry = async (email: string, password: string, attempts: number = 3) => {
  let lastResult = await supabase.auth.signInWithPassword({ email, password });

  for (let index = 1; index < attempts; index += 1) {
    if (!lastResult.error && lastResult.data.user) {
      return lastResult;
    }

    await wait(500 * index);
    lastResult = await supabase.auth.signInWithPassword({ email, password });
  }

  return lastResult;
};

const persistMerchantAuthReflection = async (email?: string | null, businessName?: string) => {
  const normalizedEmail = (email || '').trim().toLowerCase();

  await ensureCurrentMerchantProfile(businessName);

  if (normalizedEmail && businessName?.trim()) {
    await saveMerchantAccountInput({
      email: normalizedEmail,
      businessName: businessName.trim(),
    });
  }

  await recordMerchantLogin();
};

const signUpViaBackend = async (email: string, password: string, businessName: string) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/business/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        businessName,
        ownerName: businessName,
        address: 'To be updated',
        city: 'To be updated',
        state: 'To be updated',
        country: 'To be updated',
        postalCode: '0000',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        message: body?.message || `Backend signup failed (${response.status})`,
      };
    }

    return { ok: true, message: null };
  } catch (error: any) {
    const msg =
      error?.name === 'AbortError'
        ? `Backend signup request timed out after ${BACKEND_TIMEOUT_MS}ms`
        : error?.message || 'Network request failed';

    return {
      ok: false,
      message: msg,
    };
  }
};

// Sign up
export const signUp = async (email: string, password: string, fullName: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (SKIP_AUTH_MODE) {
    await saveMerchantAccountInput({ email: normalizedEmail || 'demo@stampworth.local', businessName: fullName || 'Demo Business' });
    return { data: { user: { email: normalizedEmail || 'demo@stampworth.local' } }, error: null, requiresEmailConfirmation: false } as any;
  }

  // Preferred path: backend signup guarantees merchants row creation via service-role insert.
  const backendSignup = await signUpViaBackend(normalizedEmail, password, fullName).catch((error: any) => ({
    ok: false,
    message: error?.message || 'Unable to reach backend signup endpoint',
  }));

  if (backendSignup.ok) {
    const backendSignIn = await signInWithRetry(normalizedEmail, password, 4);
    if (!backendSignIn.error && backendSignIn.data.user) {
      await persistMerchantAuthReflection(normalizedEmail, fullName);
      return { data: backendSignIn.data, error: null, requiresEmailConfirmation: false };
    }

    const backendMessage = (backendSignIn.error?.message || '').toLowerCase();
    if (
      backendMessage.includes('email not confirmed') ||
      backendMessage.includes('confirm your email') ||
      backendMessage.includes('invalid login credentials')
    ) {
      return { data: null, error: null, requiresEmailConfirmation: true };
    }

    return {
      data: null,
      error: backendSignIn.error || new Error('Account created but sign in failed. Please try signing in again.'),
      requiresEmailConfirmation: false,
    };
  }

  return {
    data: null,
    error: new Error(
      backendSignup.message ||
        'Unable to create account via backend. Check EXPO_PUBLIC_BACKEND_URL and backend service-role key.',
    ),
    requiresEmailConfirmation: false,
  };
};

// Sign in
export const signIn = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (SKIP_AUTH_MODE) {
    await saveMerchantAccountInput({ email: normalizedEmail || 'demo@stampworth.local', businessName: 'Demo Business' });
    return { data: { user: { email: normalizedEmail || 'demo@stampworth.local' } }, error: null } as any;
  }

  const { data, error } = await signInWithRetry(normalizedEmail, password, 3);

  if (error) {
    const message = (error.message || '').toLowerCase();
    if (message.includes('invalid login credentials')) {
      return {
        data,
        error: new Error(
          'Invalid login credentials. If you just created this account, create it again after backend setup is complete.',
        ),
      };
    }

    return { data, error };
  }

  if (data.user) {
    const businessName =
      (data.user.user_metadata?.business_name as string | undefined) ||
      (data.user.user_metadata?.full_name as string | undefined) ||
      (data.user.user_metadata?.name as string | undefined);
    await persistMerchantAuthReflection(normalizedEmail, businessName);
  }

  return { data, error: null };
};

export const signInWithOAuth = async (provider: SupportedOAuthProvider) => {
  if (SKIP_AUTH_MODE) {
    await saveMerchantAccountInput({ email: `${provider}-demo@stampworth.local`, businessName: 'Demo Business' });
    return { data: { user: { email: `${provider}-demo@stampworth.local` } }, error: null } as any;
  }

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
      const preferredName =
        (exchanged.data.user.user_metadata?.business_name as string | undefined) ||
        (exchanged.data.user.user_metadata?.full_name as string | undefined) ||
        (exchanged.data.user.user_metadata?.name as string | undefined);
      await persistMerchantAuthReflection(exchanged.data.user.email || null, preferredName);
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
      const preferredName =
        (sessionData.user.user_metadata?.business_name as string | undefined) ||
        (sessionData.user.user_metadata?.full_name as string | undefined) ||
        (sessionData.user.user_metadata?.name as string | undefined);
      await persistMerchantAuthReflection(sessionData.user.email || null, preferredName);
    }

    return { data: sessionData, error: null };
  }

  return { data: null, error: new Error('OAuth callback did not include a valid session.') };
};

// Sign out
export const signOut = async () => {
  if (SKIP_AUTH_MODE) {
    return { error: null } as any;
  }

  return await supabase.auth.signOut();
};

// Get current user
export const getCurrentUser = async () => {
  if (SKIP_AUTH_MODE) {
    return { id: 'local-auth', email: 'demo@stampworth.local' } as any;
  }

  const { data } = await supabase.auth.getUser();
  return data.user;
};
