import prisma from '../../../lib/prisma';
import { dailyLedgerService } from '../daily-ledger/daily-ledger.service';
import { ISummaryResult } from './summary.interface';

const BD_TIMEZONE_OFFSET_MS = 6 * 60 * 60 * 1000;

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

  const [salesAgg, salesCount, expensesAgg, expensesCount] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { price: true },
    }),
    prisma.sale.count({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  const totalSales = salesAgg._sum.price ? Number(salesAgg._sum.price) : 0;
  const totalExpenses = expensesAgg._sum.amount
    ? Number(expensesAgg._sum.amount)
    : 0;

  // Get opening/closing from ledger for 'today', calculate for others
  let openingBalance = 0;
  let closingBalance = 0;

  if (period === 'today') {
    const balance = await dailyLedgerService.getLiveBalance(userId);
    openingBalance = balance.openingBalance;
    closingBalance = balance.currentBalance;
  } else {
    // For week/month, get the first day's opening and compute closing
    const firstDayStr = dailyLedgerService.getBDDateString(startDate);
    const firstLedger = await prisma.dailyLedger.findUnique({
      where: { userId_date: { userId, date: firstDayStr } },
    });
    openingBalance = firstLedger ? Number(firstLedger.openingBalance) : 0;
    closingBalance = openingBalance + totalSales - totalExpenses;
  }

  return {
    totalSales,
    totalExpenses,
    transactionCount: salesCount,
    expenseCount: expensesCount,
    openingBalance,
    closingBalance,
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
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return sales;
};

const getExpensesListForPeriod = async (userId: string, period: string) => {
  const { startDate, endDate } = getDateRange(period);

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return expenses;
};

export const summaryService = {
  getSummary,
  getSalesListForPeriod,
  getExpensesListForPeriod,
  getDateRange,
};
