import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET() {
  const jar = await cookies();

  const participantCode = jar.get('participant_code');
  const sessionId = jar.get('session_id');

  if (!participantCode) {
    redirect('/navigation');
  }
}
