import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { DataTable } from './components/data-table';
import { columns } from './columns';
import GenerateCodeForm from './components/generate-code-form';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims) {
    redirect('/researcher/auth/login');
  }

  const { data } = await supabase
    .from('participant_codes')
    .select('id, code, group, is_used, created_at, used_at, is_active')
    .eq('is_active', true);

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="flex flex-col gap-2 items-start">
        <div className="flex w-full justify-between items-center">
          <h2 className="font-bold text-2xl mb-4">Participants</h2>
          <GenerateCodeForm />
        </div>
        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Click any code below to copy it to your clipboard.
        </p>
        <DataTable data={data ?? []} columns={columns} />
      </div>
    </div>
  );
}
