import { z } from 'zod';

export const createPaymentSchema = z.object({
  body: z.object({
    telegramId: z.string().min(1),
    method: z.enum(['BKASH', 'NAGAD']),
    transactionId: z.string().min(1).max(100),
    planType: z.enum(['PRO_MONTHLY', 'PRO_YEARLY']),
  }),
});

export const verifyPaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const rejectPaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(1).max(500).optional(),
  }),
});

export const listPaymentsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  }),
});

export type TCreatePayment = z.infer<typeof createPaymentSchema>['body'];
export type TListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>['query'];

export const PLAN_PRICES = {
  PRO_MONTHLY: 199,
  PRO_YEARLY: 1499,
} as const;

export const PLAN_DURATIONS_DAYS = {
  PRO_MONTHLY: 30,
  PRO_YEARLY: 365,
} as const;
