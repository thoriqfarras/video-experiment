import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const jar = await cookies();
  const participantCode = jar.get('participant_code');

  if (!participantCode) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { rankings } = body;

  if (!rankings || !Array.isArray(rankings)) {
    return Response.json({ error: 'Invalid rankings data' }, { status: 400 });
  }

  const supabase = await createClient();
  const admin = await createAdminClient();

  // Get participant info
  const { data: participant, error: participantError } = await supabase
    .from('participant_codes')
    .select('id, progress_counter')
    .eq('code', participantCode.value)
    .eq('is_active', true)
    .single();

  if (participantError || !participant) {
    return Response.json({ error: 'Participant not found' }, { status: 404 });
  }

  // Validate and prepare ranking records
  if (!Array.isArray(rankings) || rankings.length === 0) {
    return Response.json({ error: 'Rankings cannot be empty' }, { status: 400 });
  }

  const rankingRecords = rankings.map((ranking: { video_id?: string; id?: string }, index: number) => {
    const videoId = ranking?.video_id ?? ranking?.id;
    if (!videoId) {
      throw new Error(`Missing video_id for ranking at position ${index}`);
    }
    return {
      participant_id: participant.id,
      video_id: videoId,
      rank: index + 1,
    };
  });

  // Insert rankings
  // Use admin client to bypass RLS for privileged write
  let rankingsError;
  try {
    const res = await admin
    .from('rankings')
    .insert(rankingRecords);
    rankingsError = res.error;
  } catch (e: unknown) {
    console.error('Unexpected error inserting rankings:', e);
    return Response.json({ error: 'Failed to save rankings' }, { status: 500 });
  }

  if (rankingsError) {
    console.error('Error inserting rankings:', rankingsError);
    return Response.json({ error: 'Failed to save rankings' }, { status: 500 });
  }

  // Mark participant as used and increment progress
  // Use admin client to bypass RLS for privileged write
  const { error: updateError } = await admin
    .from('participant_codes')
    .update({ 
      is_used: true,
      progress_counter: (participant.progress_counter || 0) + 1,
      used_at: new Date().toISOString()
    })
    .eq('id', participant.id);

  if (updateError) {
    console.error('Error updating participant:', updateError);
    return Response.json({ error: 'Failed to update participant status' }, { status: 500 });
  }

  return Response.json({ success: true });
}
