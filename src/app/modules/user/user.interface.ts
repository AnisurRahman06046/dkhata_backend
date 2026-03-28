import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    telegramId: z.string().min(1, 'Telegram ID is required'),
    name: z.string().min(1, 'Name is required').max(100),
    phone: z.string().optional(),
    language: z.enum(['en', 'bn']).default('en'),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    language: z.enum(['en', 'bn']).optional(),
  }),
});

export const getUserParamsSchema = z.object({
  params: z.object({
    telegramId: z.string().min(1),
  }),
});

export type TCreateUser = z.infer<typeof createUserSchema>['body'];
export type TUpdateUser = z.infer<typeof updateUserSchema>['body'];
