import { createClient } from './supabase/server';

export async function authenticateParticipantCode(code: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('participant_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    console.log("Participant code doesn't exist.");
    return 0;
  }

  if (data.is_used) {
    console.log('Participant code has been used.');
    return 1;
  }

  console.log('Welcome participant ', data.code);
  return 2;
}
