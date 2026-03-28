import { z } from 'zod';

export const createExpenseSchema = z.object({
  body: z.object({
    telegramId: z.string().min(1, 'Telegram ID is required'),
    description: z.string().min(1, 'Description is required').max(200),
    amount: z.number().positive('Amount must be a positive number'),
  }),
});

export const getExpensesQuerySchema = z.object({
  query: z.object({
    telegramId: z.string().min(1, 'Telegram ID is required'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z
      .string()
      .transform(val => parseInt(val, 10))
      .pipe(z.number().int().positive().max(100))
      .optional(),
    offset: z
      .string()
      .transform(val => parseInt(val, 10))
      .pipe(z.number().int().min(0))
      .optional(),
  }),
});

export const deleteExpenseParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export type TCreateExpense = z.infer<typeof createExpenseSchema>['body'];

export interface IExpenseFilters {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
