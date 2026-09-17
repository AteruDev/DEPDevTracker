import { createClient } from '@supabase/supabase-js';

// This pulls the secret URLs we just downloaded in the .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// This exports the connected client so we can use it anywhere in our app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);