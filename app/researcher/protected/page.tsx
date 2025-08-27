import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect('/researcher/auth/login');
  }
  redirect('/researcher/protected/participants');
}
