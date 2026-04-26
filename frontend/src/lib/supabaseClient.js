import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Gabim: Variablat e Supabase mungojnë në .env.local!");
}

// KLIENT PËR BROWSER (Client Components)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
