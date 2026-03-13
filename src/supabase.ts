import { createClient } from '@supabase/supabase-js';

const sanitizeUrl = (url: any): string | null => {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || !trimmed.startsWith('http')) return null;
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
};

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const fallbackUrl = 'https://ehyyujscqiwawcqhbbbp.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeXl1anNjcWl3YXdjcWhiYmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTk1NTksImV4cCI6MjA4NzUzNTU1OX0.luR4zKrBwkUq4eIBUm4b-IR1UeOtI-d6AP-e_Lv6v5Y';

const supabaseUrl = sanitizeUrl(rawUrl) || fallbackUrl;
const supabaseAnonKey = (rawKey && rawKey.trim()) || fallbackKey;

export const isSupabaseConfigured = !!sanitizeUrl(rawUrl) && !!(rawKey && rawKey.trim());

// Create client with validated URL to avoid crashing on startup
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
