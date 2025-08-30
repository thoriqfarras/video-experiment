import { NextResponse } from 'next/server';
import { authenticateParticipantCode } from '@/lib/authenticateParticipant';
import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Participant code is required' },
        { status: 400 }
      );
    }

    const result = await authenticateParticipantCode(code);

    if (result === 0) {
      return NextResponse.json(
        { error: "Code doesn't exist." },
        { status: 400 }
      );
    }

    if (result === 1) {
      return NextResponse.json(
        { error: 'Code has already been used.' },
        { status: 400 }
      );
    }

    if (result !== 2) {
      return NextResponse.json(
        { error: 'Invalid participant code' },
        { status: 401 }
      );
    }

    // Increment progress counter when participant starts (privileged write)
    const supabase = await createClient();
    const admin = await createAdminClient();
    const { data: participantData, error: participantError } = await supabase
      .from('participant_codes')
      .select('id, progress_counter')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (!participantError && participantData) {
      await admin
        .from('participant_codes')
        .update({ progress_counter: (participantData.progress_counter || 0) + 1 })
        .eq('id', participantData.id);
    }

    const sessionId = crypto.randomUUID();

    const response = NextResponse.json(
      { message: 'Code verified successfully' },
      { status: 200 }
    );

    // Set cookies
    response.cookies.set('participant_code', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Error in verify-code route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
