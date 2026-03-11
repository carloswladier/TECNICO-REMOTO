import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && 
                   supabaseUrl !== 'https://your-project-url.supabase.co' && 
                   supabaseAnonKey && 
                   supabaseAnonKey !== 'your-anon-key';

if (!isConfigured) {
  console.error('Supabase configuration is missing or using placeholders. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = !!isConfigured;
