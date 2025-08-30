'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function CodeCell({ value }: { value: string | number | undefined }) {
  return <span>{value ?? ''}</span>;
}

export function CreatedAtCell({ value }: { value: string | Date }) {
  const date = new Date(value);
  const createdAt = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  return <span>{createdAt}</span>;
}

export function ResultCell({ isUsed, code }: { isUsed: boolean | undefined; code: string | undefined }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (code: string) => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      console.log('Attempting to fetch:', `/api/export-results?code=${code}`); // Debug log
      const response = await fetch(`/api/export-results?code=${code}`);
      
      console.log('Response status:', response.status); // Debug log
      
      if (!response.ok) {
        throw new Error('Failed to export results');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${code}_result.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isUsed && code) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => handleExport(code)}
        disabled={isExporting}
      >
        {isExporting ? 'Exporting...' : 'Export as .csv'}
      </Button>
    );
  }
  return <span className="text-muted-foreground">Not yet Available</span>;
}

export function ParticipantsActionsCell({ id, code }: { id: string; code?: string | number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    try {
      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('participant_codes')
        .update({ is_active: false })
        .eq('id', id);
      if (error) {
        console.error(error);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-2 relative">
      <div className="relative">
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Copy code"
          onClick={async () => {
            try {
              if (code === undefined || code === null) return;
              await navigator.clipboard.writeText(String(code));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch (err) {
              console.error(err);
            }
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        {copied ? (
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-white text-black border rounded px-2 py-0.5 shadow">
            copied
          </span>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="icon" variant="destructive" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete code?</DialogTitle>
            <DialogDescription>
              This will delete the code forever. You can’t undo this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


