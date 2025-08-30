import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const jar = await cookies();
  const participantCode = jar.get('participant_code');

  if (!participantCode) {
    return Response.json({ error: 'No participant code found. Please start from the beginning.' }, { status: 401 });
  }

  const supabase = await createClient();
  const admin = await createAdminClient();

  // Get participant info
  const { data: participant, error: participantError } = await supabase
    .from('participant_codes')
    .select('id, code, group, progress_counter, is_used')
    .eq('code', participantCode.value)
    .eq('is_active', true)
    .single();

  if (participantError || !participant) {
    return Response.json({ error: 'Invalid participant code. Please check your code and try again.' }, { status: 404 });
  }

  if (participant.is_used) {
    return Response.json({ error: 'This participant code has already been used. Please contact the researcher for a new code.' }, { status: 403 });
  }

  // Check if video order already exists for this participant
  const { data: existingOrder, error: orderError } = await supabase
    .from('video_orders')
    .select('*')
    .eq('participant_id', participant.id)
    .order('order', { ascending: true });

  if (orderError) {
    console.error('Error fetching video orders:', orderError);
    return Response.json({ error: 'Failed to fetch video orders' }, { status: 500 });
  }

  let videoOrder = existingOrder;

  // If no order exists, create one
  if (!existingOrder || existingOrder.length === 0) {
    // Get videos for this participant's group
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, url, group, sex, nar_level, thumbnail_url')
      .eq('group', participant.group)
      .eq('is_active', true);

    if (videosError || !videos) {
      console.error('Error fetching videos:', videosError);
      return Response.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    if (videos.length === 0) {
      return Response.json({ error: 'No videos available for this group' }, { status: 404 });
    }

    // Build category buckets: 2 from each combination in order
    const pickRandom = <T,>(arr: T[], count: number): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, Math.min(count, copy.length));
    };

    const highM = (videos || []).filter((v: { nar_level?: string; sex?: string }) => v.nar_level === 'high' && v.sex === 'm');
    const highF = (videos || []).filter((v: { nar_level?: string; sex?: string }) => v.nar_level === 'high' && v.sex === 'f');
    const lowM = (videos || []).filter((v: { nar_level?: string; sex?: string }) => v.nar_level === 'low' && v.sex === 'm');
    const lowF = (videos || []).filter((v: { nar_level?: string; sex?: string }) => v.nar_level === 'low' && v.sex === 'f');

    if (highM.length < 2 || highF.length < 2 || lowM.length < 2 || lowF.length < 2) {
      return Response.json({ error: 'Not enough videos per category to build the required set.' }, { status: 400 });
    }

    const selected = [
      ...pickRandom(highM, 2),
      ...pickRandom(highF, 2),
      ...pickRandom(lowM, 2),
      ...pickRandom(lowF, 2),
    ];

    // Shuffle the final 8 videos to randomize their order
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    // Create video order records in the specified sequence
    const orderRecords = selected.map((video: { id: string }, index: number) => ({
      participant_id: participant.id,
      video_id: video.id,
      order: index + 1,
    }));

    // Use admin client to bypass RLS for privileged write
    const { error: insertError } = await admin
      .from('video_orders')
      .insert(orderRecords);

    if (insertError) {
      console.error('Error creating video orders:', insertError);
      return Response.json({ error: 'Failed to create video orders' }, { status: 500 });
    }

    videoOrder = orderRecords;
  }

  // Get full video details for the order
  const videoIds = videoOrder.map(vo => vo.video_id);
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, url, group, thumbnail_url')
    .in('id', videoIds);

  if (videosError || !videos) {
    console.error('Error fetching video details:', videosError);
    return Response.json({ error: 'Failed to fetch video details' }, { status: 500 });
  }

  // Map videos to their order
  const orderedVideos = videoOrder.map(vo => {
    const video = videos.find(v => v.id === vo.video_id);
    return {
      ...video,
      order: vo.order,
    };
  }).sort((a, b) => a.order - b.order);

  const responseData = {
    participant: {
      id: participant.id,
      code: participant.code,
      group: participant.group,
      progress_counter: participant.progress_counter,
    },
    videos: orderedVideos,
  };



  return Response.json(responseData);
}

export async function POST(req: Request) {
  // Debug environment variables
  console.log('=== ENVIRONMENT DEBUG ===');
  console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('SUPABASE_URL value:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...');
  console.log('SERVICE_ROLE_KEY starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('========================');
  
  const jar = await cookies();
  const participantCode = jar.get('participant_code');

  if (!participantCode) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

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

  if (action === 'increment_progress') {
    // Increment progress counter
    console.log('Attempting to update progress for participant:', participant.id);
    console.log('Current progress:', participant.progress_counter);
    console.log('New progress will be:', participant.progress_counter + 1);
    
    const { error: updateError } = await admin
      .from('participant_codes')
      .update({ progress_counter: participant.progress_counter + 1 })
      .eq('id', participant.id);

    if (updateError) {
      console.error('Error updating progress:', updateError);
      console.error('Error details:', JSON.stringify(updateError, null, 2));
      return Response.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    return Response.json({ success: true });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
