'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import VideoForm from './video-form';

export function VideoActionsCell({ video }: { video: { id: string; url: string } }) {
  const router = useRouter();
  const [openDelete, setOpenDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    try {
      setIsDeleting(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('videos')
        .update({ is_active: false })
        .eq('id', video.id);
      if (error) {
        console.error(error);
      } else {
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
      setOpenDelete(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Watch"
        onClick={() => {
          if (!video.url) return;
          window.open(video.url, '_blank', 'noopener,noreferrer');
        }}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>

      <VideoForm mode="edit" initialData={video as { id?: string; title?: string; url: string; group?: number }} trigger={
        <Button type="button" size="icon" variant="outline" aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      } />

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogTrigger asChild>
          <Button type="button" size="icon" variant="destructive" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete video?</DialogTitle>
            <DialogDescription>
              This will delete the video forever. You can’t undo this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenDelete(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


