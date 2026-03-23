import { createClient } from '@supabase/supabase-js';

// Lexon variablat nga .env.local i frontend-it
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Gabim: Variablat e Supabase mungojnë në .env.local të frontend-it!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);