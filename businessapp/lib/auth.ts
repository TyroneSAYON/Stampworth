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

  // Check if account already exists by trying to sign in
  const { data: existingData, error: existingError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (!existingError && existingData.user) {
    // Account exists, password matches — sign them in
    await persistMerchantAuthReflection(normalizedEmail, fullName);
    return { data: existingData, error: null, requiresEmailConfirmation: false };
  }

  // Check if email exists with a different password (Supabase returns "Invalid login credentials" for both cases)
  // We proceed with signup — Supabase will return identities=[] if email is taken
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

  // Fallback: sign up directly via Supabase when backend is unreachable (e.g. running on a phone).
  const { data: directSignUp, error: directSignUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: fullName,
        business_name: fullName,
      },
    },
  });

  if (directSignUpError) {
    return { data: null, error: directSignUpError, requiresEmailConfirmation: false };
  }

  // Supabase returns identities=[] if email already exists
  if (directSignUp.user && directSignUp.user.identities && directSignUp.user.identities.length === 0) {
    return { data: null, error: new Error('An account with this email already exists. Please sign in instead.'), requiresEmailConfirmation: false };
  }

  // If user was created but email needs confirmation
  if (directSignUp.user && !directSignUp.session) {
    return { data: null, error: null, requiresEmailConfirmation: true };
  }

  // User is signed in immediately (email confirmation disabled in Supabase)
  if (directSignUp.user && directSignUp.session) {
    await persistMerchantAuthReflection(normalizedEmail, fullName);
    return { data: directSignUp, error: null, requiresEmailConfirmation: false };
  }

  return {
    data: null,
    error: new Error('Unable to create account. Please try again.'),
    requiresEmailConfirmation: false,
  };
};

// Sign in
export const signIn = async (email: string, password: string, inputBusinessName?: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (SKIP_AUTH_MODE) {
    await saveMerchantAccountInput({ email: normalizedEmail || 'demo@stampworth.local', businessName: inputBusinessName || 'Demo Business' });
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
      inputBusinessName ||
      (data.user.user_metadata?.business_name as string | undefined) ||
      (data.user.user_metadata?.full_name as string | undefined) ||
      (data.user.user_metadata?.name as string | undefined);
    await persistMerchantAuthReflection(normalizedEmail, businessName);

    // Validate business name against the registered merchant profile
    if (inputBusinessName?.trim()) {
      const { data: merchant } = await supabase
        .from('merchants')
        .select('business_name')
        .eq('owner_email', normalizedEmail)
        .maybeSingle();

      if (merchant?.business_name && merchant.business_name.toLowerCase() !== inputBusinessName.trim().toLowerCase()) {
        // Sign out — don't leave a valid session with wrong business name
        await supabase.auth.signOut();
        return { data: null, error: new Error(`Business name doesn't match the account registered with this email.`) };
      }
    }
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
