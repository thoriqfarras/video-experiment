import { startSchema } from '@/app/validation/start';
import { authenticateParticipantCode } from '@/lib/authenticateParticipant';
import { NextApiRequest, NextApiResponse } from 'next';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();

  if (!body) {
    return Response.json({ error: 'Missing code.' });
  }

  const { data, error } = startSchema.safeParse(body);

  if (error) {
    return Response.json({ error: 'Invalid code.' });
  }

  const { code } = data;

  const result = await authenticateParticipantCode(code);

  if (result === 0) {
    return Response.json({ error: "Code doesn't exist." }, { status: 400 });
  }

  if (result === 1) {
    return Response.json(
      { error: 'Code has already been used.' },
      { status: 400 }
    );
  }

  const sessionId = crypto.randomUUID();
  const jar = await cookies();
  // adjust maxAge as needed (e.g., 60*60 for 1h)
  jar.set('participant_code', code, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60,
  });
  jar.set('session_id', sessionId, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60,
  });

  return Response.json({
    message: 'Successfully verified user.',
  });
  // return new Response('Successfully verified code.', {
  //   status: 200,
  //   headers: { 'Set-Cookie': `${code}:${sessionId}` },
  // });
}
