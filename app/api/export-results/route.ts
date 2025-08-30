import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const participantCode = searchParams.get('code');

  if (!participantCode) {
    return new Response('Missing participant code parameter', { status: 400 });
  }

  try {
    const supabase = await createClient();

    // Get participant info
    const { data: participant, error: participantError } = await supabase
      .from('participant_codes')
      .select('id, code')
      .eq('code', participantCode)
      .eq('is_active', true)
      .single();

    if (participantError || !participant) {
      return new Response('Participant not found', { status: 404 });
    }

    // Get rankings for this participant (sorted by rank ascending)
    const { data: rankings, error: rankingError } = await supabase
      .from('rankings')
      .select('video_id, rank')
      .eq('participant_id', participant.id)
      .order('rank', { ascending: true });

    if (rankingError || !rankings || rankings.length === 0) {
      return new Response('No rankings found for this participant', { status: 404 });
    }

    // Get video details for the ranked videos
    const videoIds = rankings.map(r => r.video_id);
    const { data: videos, error: videoError } = await supabase
      .from('videos')
      .select('id, title, url, sex, nar_level')
      .in('id', videoIds);

    if (videoError || !videos) {
      return new Response('Failed to fetch video details', { status: 500 });
    }

    // Create CSV content
    const csvRows = ['title,nar_level,sex,url,rank'];
    
    // Map rankings to video details (already sorted by rank ascending)
    rankings.forEach(ranking => {
      const video = videos.find(v => v.id === ranking.video_id);
      if (video) {
        // Escape quotes and commas in CSV values
        const title = video.title.replace(/"/g, '""');
        const url = video.url.replace(/"/g, '""');
        const sex = video.sex.replace(/"/g, '""');
        const nar_level = video.nar_level.replace(/"/g, '""');
        csvRows.push(`"${title}",${nar_level}, ${sex},"${url}", ${ranking.rank}`);
      }
    });

    const csvContent = csvRows.join('\n');
    const filename = `${participantCode}_result.csv`;

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error exporting results:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export const runtime = 'nodejs';
