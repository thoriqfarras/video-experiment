import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { DataTable } from './components/data-table';
import { columns } from './columns';
import VideoForm from './components/video-form';

export default async function ProtectedVideosPage() {
  const supabase = await createClient();

  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims) {
    redirect('/researcher/auth/login');
  }

  const { data } = await supabase
    .from('videos')
    .select('id, title, group, url, sex, nar_level, thumbnail_url, thumbnail_proxy_url, is_active')
    .eq('is_active', true);

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="flex flex-col gap-2 items-start">
        <div className="flex w-full justify-between items-center">
          <h2 className="font-bold text-2xl mb-4">Videos</h2>
          <VideoForm />
        </div>
        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Manage your videos. Use Actions to watch, edit, or delete.
        </p>
        <DataTable data={data ?? []} columns={columns} />
      </div>
    </div>
  );
}


