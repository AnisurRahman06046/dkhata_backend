import { z } from 'zod';

export const createSaleSchema = z.object({
  body: z.object({
    telegramId: z.string().min(1, 'Telegram ID is required'),
    productName: z.string().min(1, 'Product name is required').max(200),
    price: z.number().positive('Price must be a positive number'),
    quantity: z.number().int().positive().default(1),
  }),
});

export const getSalesQuerySchema = z.object({
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

export const deleteSaleParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export type TCreateSale = z.infer<typeof createSaleSchema>['body'];
export type TGetSalesQuery = z.infer<typeof getSalesQuerySchema>['query'];

export interface ISaleFilters {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
