import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ParticipantCodeForm from '@/components/ParticipantCodeForm';

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <nav className="w-full py-2 px-3 flex justify-end">
        <Button variant="link" className="text-zinc-500">
          <Link href="/researcher/auth/login">Masuk sebagai Peneliti</Link>
        </Button>
      </nav>
      <ParticipantCodeForm />
    </main>
  );
}
