import { createClient } from '@supabase/supabase-js';

export async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(`Missing environment variables: SUPABASE_URL=${!!supabaseUrl}, SERVICE_ROLE_KEY=${!!serviceRoleKey}`);
  }
  
  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false, // Admin client should not persist sessions
      },
    }
  );
}
