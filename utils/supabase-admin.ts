import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = process.env.SUPABASE_URL || '';
const supabaseKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY || '';  // Use the service role key

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or service role key is missing');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
