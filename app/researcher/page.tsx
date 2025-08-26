import { redirect } from 'next/navigation';

export default async function ExperimentPage() {
  redirect('/researcher/auth/login');
}
