import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ExperimentPage() {
  const jar = await cookies();

  const participantCode = jar.get('participant_code');
  // const sessionId = jar.get('session_id');

  if (!participantCode) {
    redirect('/');
  }

  return (
    <main className="min-h-screen flex flex-col items-center border border-black">
      <div className="flex-1 flex flex-col items-center justify-between">
        <div></div>
        <iframe
          className="self-center"
          src="https://drive.google.com/file/d/1oJCmopFGALCef5K5oX-bAq4wxOoYLvJw/preview"
          width="640"
          height="480"
          allow="autoplay"
        ></iframe>
        <div className="justify-self-end self-end">Test</div>
      </div>
    </main>
  );
}
