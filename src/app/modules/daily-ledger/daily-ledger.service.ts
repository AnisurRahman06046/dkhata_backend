import { Prisma } from '../../../../generated/prisma/client';
import prisma from '../../../lib/prisma';
import logger from '../../utils/logger';

const BD_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC+6

export const getBDDateString = (date?: Date): string => {
  const d = date ? new Date(date.getTime()) : new Date();
  const bd = new Date(d.getTime() + BD_OFFSET_MS);
  const y = bd.getUTCFullYear();
  const m = String(bd.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bd.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getYesterdayDateString = (): string => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return getBDDateString(yesterday);
};

const getBDMidnight = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMidnightBD = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  return new Date(utcMidnightBD.getTime() - BD_OFFSET_MS);
};

const getBDEndOfDay = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcEndBD = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return new Date(utcEndBD.getTime() - BD_OFFSET_MS);
};

const getOrCreateTodayLedger = async (userId: string) => {
  const todayStr = getBDDateString();

  // Try to find today's ledger
  const existing = await prisma.dailyLedger.findUnique({
    where: { userId_date: { userId, date: todayStr } },
  });

  if (existing) return existing;

  // Calculate opening balance from yesterday's closing
  const openingBalance = await calculateOpeningBalance(userId);

  // Create today's ledger
  const ledger = await prisma.dailyLedger.create({
    data: {
      userId,
      date: todayStr,
      openingBalance: new Prisma.Decimal(openingBalance),
      totalSales: new Prisma.Decimal(0),
      totalExpenses: new Prisma.Decimal(0),
      closingBalance: new Prisma.Decimal(openingBalance),
    },
  });

  return ledger;
};

const calculateOpeningBalance = async (userId: string): Promise<number> => {
  // Find the most recent closed ledger
  const lastLedger = await prisma.dailyLedger.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  if (lastLedger) {
    return Number(lastLedger.closingBalance);
  }

  // First day — use user's initial balance
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { initialBalance: true },
  });

  return user ? Number(user.initialBalance) : 0;
};

const recalculateLedger = async (userId: string, dateStr?: string) => {
  const targetDate = dateStr || getBDDateString();
  const ledger = await prisma.dailyLedger.findUnique({
    where: { userId_date: { userId, date: targetDate } },
  });

  if (!ledger) return null;

  const dayStart = getBDMidnight(targetDate);
  const dayEnd = getBDEndOfDay(targetDate);

  // Aggregate sales and expenses for the day
  const [salesAgg, expensesAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        userId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      _sum: { price: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalSales = salesAgg._sum.price ? Number(salesAgg._sum.price) : 0;
  const totalExpenses = expensesAgg._sum.amount
    ? Number(expensesAgg._sum.amount)
    : 0;
  const opening = Number(ledger.openingBalance);
  const closing = opening + totalSales - totalExpenses;

  const updated = await prisma.dailyLedger.update({
    where: { userId_date: { userId, date: targetDate } },
    data: {
      totalSales: new Prisma.Decimal(totalSales),
      totalExpenses: new Prisma.Decimal(totalExpenses),
      closingBalance: new Prisma.Decimal(closing),
    },
  });

  return updated;
};

const recordSale = async (userId: string, amount: number) => {
  const ledger = await getOrCreateTodayLedger(userId);

  const newTotalSales = Number(ledger.totalSales) + amount;
  const newClosing = Number(ledger.openingBalance) + newTotalSales - Number(ledger.totalExpenses);

  await prisma.dailyLedger.update({
    where: { id: ledger.id },
    data: {
      totalSales: new Prisma.Decimal(newTotalSales),
      closingBalance: new Prisma.Decimal(newClosing),
    },
  });
};

const recordExpense = async (userId: string, amount: number) => {
  const ledger = await getOrCreateTodayLedger(userId);

  const newTotalExpenses = Number(ledger.totalExpenses) + amount;
  const newClosing = Number(ledger.openingBalance) + Number(ledger.totalSales) - newTotalExpenses;

  await prisma.dailyLedger.update({
    where: { id: ledger.id },
    data: {
      totalExpenses: new Prisma.Decimal(newTotalExpenses),
      closingBalance: new Prisma.Decimal(newClosing),
    },
  });
};

const getLiveBalance = async (userId: string) => {
  const ledger = await getOrCreateTodayLedger(userId);

  return {
    date: ledger.date,
    openingBalance: Number(ledger.openingBalance),
    totalSales: Number(ledger.totalSales),
    totalExpenses: Number(ledger.totalExpenses),
    currentBalance: Number(ledger.closingBalance),
    isClosed: ledger.isClosed,
  };
};

const endDay = async (userId: string) => {
  const todayStr = getBDDateString();
  const ledger = await getOrCreateTodayLedger(userId);

  // Recalculate to ensure accuracy
  const recalculated = await recalculateLedger(userId, todayStr);
  const final = recalculated || ledger;

  // Mark as closed
  const closed = await prisma.dailyLedger.update({
    where: { id: final.id },
    data: {
      isClosed: true,
      closedAt: new Date(),
    },
  });

  return {
    date: closed.date,
    openingBalance: Number(closed.openingBalance),
    totalSales: Number(closed.totalSales),
    totalExpenses: Number(closed.totalExpenses),
    closingBalance: Number(closed.closingBalance),
  };
};

const setInitialBalance = async (userId: string, amount: number) => {
  await prisma.user.update({
    where: { id: userId },
    data: { initialBalance: new Prisma.Decimal(amount) },
  });

  // If today's ledger exists and is the first ever, update it
  const todayStr = getBDDateString();
  const ledger = await prisma.dailyLedger.findUnique({
    where: { userId_date: { userId, date: todayStr } },
  });

  if (ledger) {
    const newClosing = amount + Number(ledger.totalSales) - Number(ledger.totalExpenses);
    await prisma.dailyLedger.update({
      where: { id: ledger.id },
      data: {
        openingBalance: new Prisma.Decimal(amount),
        closingBalance: new Prisma.Decimal(newClosing),
      },
    });
  }
};

const autoCloseYesterday = async () => {
  const yesterdayStr = getYesterdayDateString();

  try {
    const openLedgers = await prisma.dailyLedger.findMany({
      where: {
        date: yesterdayStr,
        isClosed: false,
      },
      include: { user: { select: { telegramId: true } } },
    });

    for (const ledger of openLedgers) {
      await recalculateLedger(ledger.userId, yesterdayStr);

      await prisma.dailyLedger.update({
        where: { id: ledger.id },
        data: {
          isClosed: true,
          closedAt: new Date(),
        },
      });
    }

    if (openLedgers.length > 0) {
      logger.info(`Auto-closed ${openLedgers.length} ledgers for ${yesterdayStr}`);
    }

    return openLedgers.map(l => l.user.telegramId);
  } catch (error) {
    logger.error('Auto-close failed:', error);
    return [];
  }
};

const undoSale = async (userId: string, amount: number) => {
  const ledger = await getOrCreateTodayLedger(userId);

  const newTotalSales = Math.max(0, Number(ledger.totalSales) - amount);
  const newClosing = Number(ledger.openingBalance) + newTotalSales - Number(ledger.totalExpenses);

  await prisma.dailyLedger.update({
    where: { id: ledger.id },
    data: {
      totalSales: new Prisma.Decimal(newTotalSales),
      closingBalance: new Prisma.Decimal(newClosing),
    },
  });
};

const undoExpense = async (userId: string, amount: number) => {
  const ledger = await getOrCreateTodayLedger(userId);

  const newTotalExpenses = Math.max(0, Number(ledger.totalExpenses) - amount);
  const newClosing = Number(ledger.openingBalance) + Number(ledger.totalSales) - newTotalExpenses;

  await prisma.dailyLedger.update({
    where: { id: ledger.id },
    data: {
      totalExpenses: new Prisma.Decimal(newTotalExpenses),
      closingBalance: new Prisma.Decimal(newClosing),
    },
  });
};

export const dailyLedgerService = {
  getOrCreateTodayLedger,
  calculateOpeningBalance,
  recalculateLedger,
  recordSale,
  recordExpense,
  getLiveBalance,
  endDay,
  setInitialBalance,
  autoCloseYesterday,
  undoSale,
  undoExpense,
  getBDDateString,
};
