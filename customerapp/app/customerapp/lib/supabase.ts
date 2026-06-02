import { createClient } from '@supabase/supabase-js';

// Provide a minimal declaration for `process.env` so TypeScript doesn't
// complain in environments where Node types aren't available (e.g. Expo).
declare const process: {
	env: {
		EXPO_PUBLIC_SUPABASE_URL?: string;
		EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
		[key: string]: string | undefined;
	};
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
