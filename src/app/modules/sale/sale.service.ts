import { Prisma } from '../../../../generated/prisma/client';
import prisma from '../../../lib/prisma';
import { NotFoundError } from '../../errors';
import { userService } from '../user/user.service';
import { dailyLedgerService } from '../daily-ledger/daily-ledger.service';
import { ISaleFilters } from './sale.interface';

const BD_TIMEZONE_OFFSET_MS = 6 * 60 * 60 * 1000;

const getTodayStartUTC = (): Date => {
  const now = new Date();
  const bdTime = new Date(now.getTime() + BD_TIMEZONE_OFFSET_MS);
  bdTime.setUTCHours(0, 0, 0, 0);
  return new Date(bdTime.getTime() - BD_TIMEZONE_OFFSET_MS);
};

const createSale = async (
  telegramId: string,
  productName: string,
  price: number,
  quantity = 1,
) => {
  const user = await userService.getUserByTelegramId(telegramId);
  if (!user) {
    throw new NotFoundError('User not found. Please register with /start first.');
  }

  const sale = await prisma.sale.create({
    data: {
      userId: user.id,
      productName,
      price: new Prisma.Decimal(price),
      quantity,
    },
  });

  // Update daily ledger
  await dailyLedgerService.recordSale(user.id, price);

  return sale;
};

const createSaleByUserId = async (
  userId: string,
  productName: string,
  price: number,
  quantity = 1,
) => {
  const sale = await prisma.sale.create({
    data: {
      userId,
      productName,
      price: new Prisma.Decimal(price),
      quantity,
    },
  });

  // Update daily ledger
  await dailyLedgerService.recordSale(userId, price);

  return sale;
};

const getSalesByUser = async (filters: ISaleFilters) => {
  const { userId, startDate, endDate, limit = 20, offset = 0 } = filters;

  const where: Prisma.SaleWhereInput = { userId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.sale.count({ where }),
  ]);

  return { sales, total, limit, offset };
};

const getTodaySales = async (userId: string) => {
  const todayStart = getTodayStartUTC();

  return getSalesByUser({
    userId,
    startDate: todayStart,
    limit: 100,
  });
};

const deleteSale = async (saleId: string, userId: string) => {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, userId },
  });

  if (!sale) {
    throw new NotFoundError('Sale not found');
  }

  await prisma.sale.delete({ where: { id: saleId } });

  // Reverse from daily ledger
  await dailyLedgerService.undoSale(userId, Number(sale.price));

  return sale;
};

const getUnsyncedSales = async (limit = 50) => {
  return prisma.sale.findMany({
    where: {
      syncedToSheets: false,
      user: {
        plan: { not: 'FREE' },
        planExpiresAt: { gt: new Date() },
      },
    },
    include: { user: { select: { telegramId: true, name: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
};

const markSalesSynced = async (saleIds: string[]) => {
  await prisma.sale.updateMany({
    where: { id: { in: saleIds } },
    data: { syncedToSheets: true },
  });
};

export const saleService = {
  createSale,
  createSaleByUserId,
  getSalesByUser,
  getTodaySales,
  deleteSale,
  getUnsyncedSales,
  markSalesSynced,
};
