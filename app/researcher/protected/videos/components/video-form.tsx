'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useForm } from 'react-hook-form';
import z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Helper function to convert Google Drive sharing links to proxy URLs
const convertDriveUrlToProxy = (url: string): string => {
  if (!url) return url;
  
  // Remove any trailing slashes and query parameters
  const cleanUrl = url.split('?')[0].replace(/\/$/, '');
  
  // Pattern 1: https://drive.google.com/file/d/FILE_ID/view
  const filePattern1 = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = cleanUrl.match(filePattern1);
  if (match1) {
    const driveUrl = `https://drive.google.com/uc?export=view&id=${match1[1]}`;
    return `/api/proxy-image?url=${encodeURIComponent(driveUrl)}`;
  }
  
  // Pattern 2: https://drive.google.com/open?id=FILE_ID
  const filePattern2 = /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const match2 = cleanUrl.match(filePattern2);
  if (match2) {
    const driveUrl = `https://drive.google.com/uc?export=view&id=${match2[1]}`;
    return `/api/proxy-image?url=${encodeURIComponent(driveUrl)}`;
  }
  
  // Pattern 3: https://drive.google.com/uc?export=view&id=FILE_ID (already in correct format)
  const filePattern3 = /https:\/\/drive\.google\.com\/uc\?export=view&id=([a-zA-Z0-9_-]+)/;
  const match3 = cleanUrl.match(filePattern3);
  if (match3) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  
  // If it's not a Drive URL, return as is
  return url;
};

type Video = {
  id?: string;
  title: string;
  url: string;
  group: number;
  sex?: string;
  nar_level?: string;
  thumbnail_url?: string;
};

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Must be a valid URL'),
  group: z.coerce.number().int().refine((v) => v === 1 || v === 2, { message: 'Group must be 1 or 2' }),
  sex: z.enum(['m', 'f']).optional(),
  nar_level: z.enum(['high', 'low']).optional(),
  thumbnail_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});
type Schema = z.infer<typeof schema>;

export default function VideoForm({
  mode = 'create',
  initialData,
  trigger,
}: {
  mode?: 'create' | 'edit';
  initialData?: Partial<Video>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [urlConverted, setUrlConverted] = useState(false);
  const router = useRouter();

  const form = useForm<Schema>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: initialData?.title ?? '',
      url: initialData?.url ?? '',
      group: (initialData?.group as number | undefined) ?? 1,
      sex: (initialData?.sex as string | undefined) as 'm' | 'f' | undefined,
      nar_level: (initialData?.nar_level as string | undefined) as 'high' | 'low' | undefined,
      thumbnail_url: initialData?.thumbnail_url ?? '',
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      setUrlConverted(false);
      form.reset({
        title: initialData?.title ?? '',
        url: initialData?.url ?? '',
        group: (initialData?.group as number | undefined) ?? 1,
        sex: (initialData?.sex as string | undefined) as 'm' | 'f' | undefined,
        nar_level: (initialData?.nar_level as string | undefined) as 'high' | 'low' | undefined,
        thumbnail_url: initialData?.thumbnail_url ?? '',
      });
    }
    // We intentionally do not include form.reset and initialData fields to avoid overwriting during typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit: SubmitHandler<Schema> = async (values) => {
    const supabase = createClient();
    setSubmitError(null);
    
    // Convert Google Drive URL to proxy URL if needed
    const originalUrl = values.thumbnail_url;
    const convertedUrl = values.thumbnail_url ? convertDriveUrlToProxy(values.thumbnail_url) : values.thumbnail_url;
    const processedValues = {
      ...values,
      thumbnail_url: convertedUrl
    };
    
    // Show conversion indicator if URL was changed
    if (originalUrl && originalUrl !== convertedUrl) {
      setUrlConverted(true);
      setTimeout(() => setUrlConverted(false), 3000); // Hide after 3 seconds
    }
    const handleServerError = (msg?: string) => {
      const text = (msg ?? '').toLowerCase();
      const mentionsTitle = text.includes('title');
      const mentionsUrl = text.includes('url');
      if (mentionsTitle) {
        form.setError('title', {
          type: 'server',
          message: 'A video with this title already exists.',
        });
      }
      if (mentionsUrl) {
        form.setError('url', {
          type: 'server',
          message: 'A video with this URL already exists.',
        });
      }
      if (!mentionsTitle && !mentionsUrl) {
        setSubmitError('Something went wrong. Please try again.');
      } else {
        setSubmitError(null);
      }
    };
    if (mode === 'edit' && initialData?.id) {
      const { error } = await supabase
        .from('videos')
        .update({ title: processedValues.title, url: processedValues.url, group: processedValues.group, sex: processedValues.sex, nar_level: processedValues.nar_level, thumbnail_url: processedValues.thumbnail_url })
        .eq('id', initialData.id);
      if (error) {
        console.error(error);
        handleServerError(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('videos')
        .insert({ title: processedValues.title, url: processedValues.url, group: processedValues.group, sex: processedValues.sex, nar_level: processedValues.nar_level, thumbnail_url: processedValues.thumbnail_url, is_active: true });
      if (error) {
        console.error(error);
        handleServerError(error.message);
        return;
      }
    }
    router.refresh();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add video
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit video' : 'Add video'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update the details below.' : 'Fill in the details to add a new video.'}
          </DialogDescription>
        </DialogHeader>
        {submitError ? (
          <p className="text-destructive text-sm">{submitError}</p>
        ) : null}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={2}
                      step={1}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sex</FormLabel>
                  <FormControl>
                    <select
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value as 'M' | 'F')}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select</option>
                      <option value="m">M</option>
                      <option value="f">F</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nar_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nar Level</FormLabel>
                  <FormControl>
                    <select
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value as 'high' | 'low')}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="thumbnail_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail URL</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="https://drive.google.com/file/d/... or any image URL"
                      type="url"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500 mt-1">
                    You can paste a Google Drive sharing link - it will be automatically converted to a proxy URL to avoid CORS issues.
                  </p>
                  {urlConverted && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Google Drive link converted to proxy URL
                    </p>
                  )}
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


