'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';

export default function GenerateCodeForm() {
  const [open, setOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();

  const schema = z.object({
    group: z
      .coerce
      .number()
      .int('Group must be an integer')
      .refine((v) => v === 1 || v === 2, { message: 'Group must be 1 or 2' }),
  });
  type Schema = z.infer<typeof schema>;

  const form = useForm<Schema>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { group: 1 },
    mode: 'onTouched',
  });

  const onSubmit: SubmitHandler<Schema> = async (values) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('participant_codes')
      .insert({ group: values.group })
      .select('code')
      .single();
    if (error) {
      console.error(error);
      return;
    }
    const newCode = (data as { code?: string } | null)?.code ?? '';
    setGeneratedCode(newCode);
    setIsCopied(false);
    router.refresh();
    form.reset({ group: 1 });
  };

  useEffect(() => {
    // Reset copy state when dialog closes or new code is shown
    if (!open) setIsCopied(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Generate Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{generatedCode ? 'Participant code generated' : 'Generate participant code'}</DialogTitle>
          <DialogDescription>
            {generatedCode ? 'Copy the code below and share it with the participant.' : 'Choose a group and create a new code.'}
          </DialogDescription>
        </DialogHeader>
        {generatedCode ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input readOnly value={generatedCode} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="default"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(generatedCode);
                    setIsCopied(true);
                  } catch (err) {
                    console.error(err);
                  }
                }}
                disabled={isCopied}
              >
                {isCopied ? 'Copied to clipboard' : 'Copy to clipboard'}
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setGeneratedCode(null);
                    setIsCopied(false);
                  }}
                >
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
                  {form.formState.isSubmitting ? 'Saving…' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
