import z from 'zod';

export const startSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty.'),
});
