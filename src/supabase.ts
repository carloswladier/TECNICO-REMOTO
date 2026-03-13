import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ehyyujscqiwawcqhbbbp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeXl1anNjcWl3YXdjcWhiYmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTk1NTksImV4cCI6MjA4NzUzNTU1OX0.luR4zKrBwkUq4eIBUm4b-IR1UeOtI-d6AP-e_Lv6v5Y';

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
