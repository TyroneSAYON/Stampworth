import { supabase } from '@/lib/supabase';

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
  return { data, error };
};

// Sign in
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
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
