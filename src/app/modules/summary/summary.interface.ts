import { z } from 'zod';

export const summaryQuerySchema = z.object({
  query: z.object({
    telegramId: z.string().min(1, 'Telegram ID is required'),
    period: z.enum(['today', 'week', 'month']).default('today'),
  }),
});

export type TSummaryQuery = z.infer<typeof summaryQuerySchema>['query'];

export interface ISummaryResult {
  totalSales: number;
  totalExpenses: number;
  transactionCount: number;
  expenseCount: number;
  openingBalance: number;
  closingBalance: number;
  period: string;
  startDate: Date;
  endDate: Date;
}
