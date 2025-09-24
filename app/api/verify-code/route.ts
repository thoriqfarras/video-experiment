import { NextResponse } from 'next/server';
import { authenticateParticipantCode } from '@/lib/authenticateParticipant';

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

    // Do not increment progress here; the experiment flow will handle it

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
