import { Prisma } from '../../../../generated/prisma/client';
import prisma from '../../../lib/prisma';
import { NotFoundError } from '../../errors';
import { IExpenseFilters } from './expense.interface';

const createExpense = async (
  userId: string,
  description: string,
  amount: number,
) => {
  const expense = await prisma.expense.create({
    data: {
      userId,
      description,
      amount: new Prisma.Decimal(amount),
    },
  });

  return expense;
};

const getExpensesByUser = async (filters: IExpenseFilters) => {
  const { userId, startDate, endDate, limit = 20, offset = 0 } = filters;

  const where: Prisma.ExpenseWhereInput = { userId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.expense.count({ where }),
  ]);

  return { expenses, total, limit, offset };
};

const deleteExpense = async (expenseId: string, userId: string) => {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
  });

  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  await prisma.expense.delete({ where: { id: expenseId } });

  return expense;
};

const getUnsyncedExpenses = async (limit = 50) => {
  return prisma.expense.findMany({
    where: { syncedToSheets: false },
    include: { user: { select: { telegramId: true, name: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
};

const markExpensesSynced = async (expenseIds: string[]) => {
  await prisma.expense.updateMany({
    where: { id: { in: expenseIds } },
    data: { syncedToSheets: true },
  });
};

export const expenseService = {
  createExpense,
  getExpensesByUser,
  deleteExpense,
  getUnsyncedExpenses,
  markExpensesSynced,
};
