import { authenticateParticipantCode } from '@/lib/authenticateParticipant';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ExperimentPage() {
  const jar = await cookies();

  const participantCode = jar.get('participant_code');
  const sessionId = jar.get('session_id');

  if (!participantCode) {
    redirect('/');
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      Welcome to the experiment
    </main>
  );
}

function ThankYouPage() {
  return <>Thank you</>;
}
