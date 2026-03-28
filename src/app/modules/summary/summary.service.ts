import prisma from '../../../lib/prisma';
import { ISummaryResult } from './summary.interface';

const BD_TIMEZONE_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC+6

const getBDMidnight = (date: Date): Date => {
  const bdTime = new Date(date.getTime() + BD_TIMEZONE_OFFSET_MS);
  bdTime.setUTCHours(0, 0, 0, 0);
  return new Date(bdTime.getTime() - BD_TIMEZONE_OFFSET_MS);
};

const getDateRange = (period: string): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const todayStart = getBDMidnight(now);

  switch (period) {
    case 'week': {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 6);
      return { startDate: getBDMidnight(weekStart), endDate: now };
    }
    case 'month': {
      const bdNow = new Date(now.getTime() + BD_TIMEZONE_OFFSET_MS);
      const monthStart = new Date(
        Date.UTC(bdNow.getUTCFullYear(), bdNow.getUTCMonth(), 1),
      );
      return {
        startDate: new Date(monthStart.getTime() - BD_TIMEZONE_OFFSET_MS),
        endDate: now,
      };
    }
    default:
      return { startDate: todayStart, endDate: now };
  }
};

const getSummary = async (
  userId: string,
  period: string,
): Promise<ISummaryResult> => {
  const { startDate, endDate } = getDateRange(period);

  const aggregate = await prisma.sale.aggregate({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: { price: true },
    _count: true,
  });

  return {
    totalSales: aggregate._sum.price
      ? Number(aggregate._sum.price)
      : 0,
    transactionCount: aggregate._count,
    period,
    startDate,
    endDate,
  };
};

const getSalesListForPeriod = async (userId: string, period: string) => {
  const { startDate, endDate } = getDateRange(period);

  const sales = await prisma.sale.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return sales;
};

export const summaryService = {
  getSummary,
  getSalesListForPeriod,
  getDateRange,
};
