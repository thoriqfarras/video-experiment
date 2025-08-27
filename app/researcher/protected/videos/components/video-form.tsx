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

type Video = {
  id?: string;
  title: string;
  url: string;
  group: number;
};

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Must be a valid URL'),
  group: z.coerce.number().int().refine((v) => v === 1 || v === 2, { message: 'Group must be 1 or 2' }),
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
  const router = useRouter();

  const form = useForm<Schema>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: initialData?.title ?? '',
      url: initialData?.url ?? '',
      group: (initialData?.group as number | undefined) ?? 1,
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      form.reset({
        title: initialData?.title ?? '',
        url: initialData?.url ?? '',
        group: (initialData?.group as number | undefined) ?? 1,
      });
    }
    // We intentionally do not include form.reset and initialData fields to avoid overwriting during typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit: SubmitHandler<Schema> = async (values) => {
    const supabase = createClient();
    setSubmitError(null);
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
        .update({ title: values.title, url: values.url, group: values.group })
        .eq('id', initialData.id);
      if (error) {
        console.error(error);
        handleServerError(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('videos')
        .insert({ title: values.title, url: values.url, group: values.group, is_active: true });
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


