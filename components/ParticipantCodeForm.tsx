'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { startSchema } from '@/app/validation/start';
import { axiosService } from '@/lib/axios/axiosService';
import { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ParticipantCodeForm() {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof startSchema>>({
    resolver: zodResolver(startSchema),
    defaultValues: {
      code: '',
    },
  });

  async function onSubmit(values: z.infer<typeof startSchema>) {
    try {
      const response = await axiosService.post('/api/verify-code', values);
      if (response.status === 200) {
        setIsSuccess(true);
      }
      router.push('/experiment');
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        form.setError('code', {
          type: 'custom',
          message: error.response?.data?.error || 'An error occurred',
        });
      }
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col flex-1 justify-center"
      >
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p>
          Enter your <b>Participant Code</b> to start the experiment.
        </p>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-500 text-sm mt-2">
                Participant Code
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      form.handleSubmit(onSubmit);
                    }
                  }}
                />
              </FormControl>
              <FormMessage className="font-medium text-sm" />
              {isSuccess && (
                <p className="text-green-600">
                  The experiment will begin shortly.
                </p>
              )}
              <p></p>
            </FormItem>
          )}
        ></FormField>
        <div className="mt-2 flex justify-between">
          <p className="text-green-600 justify-self-start font-medium text-sm">
            {isSuccess && 'The experiment will begin shortly.'}
          </p>
          <Button
            type="submit"
            className="justify-self-end"
            disabled={!form.formState.isValid}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Start'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
