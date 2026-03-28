import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendApiResponse from '../../utils/sendApiResponse';
import { expenseService } from './expense.service';
import { userService } from '../user/user.service';
import { NotFoundError } from '../../errors';

const createExpense = catchAsync(async (req, res) => {
  const { telegramId, description, amount } = req.body;

  const user = await userService.getUserByTelegramId(telegramId);
  if (!user) throw new NotFoundError('User not found');

  const expense = await expenseService.createExpense(
    user.id,
    description,
    amount,
  );

  sendApiResponse(
    res,
    httpStatus.CREATED,
    'Expense recorded successfully',
    expense,
  );
});

const getExpenses = catchAsync(async (req, res) => {
  const { telegramId, startDate, endDate, limit, offset } = req.query;

  const user = await userService.getUserByTelegramId(telegramId as string);
  if (!user) throw new NotFoundError('User not found');

  const result = await expenseService.getExpensesByUser({
    userId: user.id,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  });

  sendApiResponse(
    res,
    httpStatus.OK,
    'Expenses retrieved successfully',
    result,
  );
});

const deleteExpense = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { telegramId } = req.query;

  const user = await userService.getUserByTelegramId(telegramId as string);
  if (!user) throw new NotFoundError('User not found');

  const expense = await expenseService.deleteExpense(id, user.id);

  sendApiResponse(
    res,
    httpStatus.OK,
    'Expense deleted successfully',
    expense,
  );
});

export const expenseController = {
  createExpense,
  getExpenses,
  deleteExpense,
};
