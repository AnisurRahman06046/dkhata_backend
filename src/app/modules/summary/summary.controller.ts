import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendApiResponse from '../../utils/sendApiResponse';
import { summaryService } from './summary.service';
import { userService } from '../user/user.service';
import { NotFoundError } from '../../errors';

const getSummary = catchAsync(async (req, res) => {
  const { telegramId, period = 'today' } = req.query;

  const user = await userService.getUserByTelegramId(telegramId as string);
  if (!user) throw new NotFoundError('User not found');

  const [summary, sales, expenses] = await Promise.all([
    summaryService.getSummary(user.id, period as string),
    summaryService.getSalesListForPeriod(user.id, period as string),
    summaryService.getExpensesListForPeriod(user.id, period as string),
  ]);

  sendApiResponse(res, httpStatus.OK, 'Summary retrieved successfully', {
    ...summary,
    sales,
    expenses,
  });
});

const getTodaySummary = catchAsync(async (req, res) => {
  const { telegramId } = req.query;

  const user = await userService.getUserByTelegramId(telegramId as string);
  if (!user) throw new NotFoundError('User not found');

  const [summary, sales, expenses] = await Promise.all([
    summaryService.getSummary(user.id, 'today'),
    summaryService.getSalesListForPeriod(user.id, 'today'),
    summaryService.getExpensesListForPeriod(user.id, 'today'),
  ]);

  sendApiResponse(res, httpStatus.OK, 'Today summary retrieved', {
    ...summary,
    sales,
    expenses,
  });
});

export const summaryController = {
  getSummary,
  getTodaySummary,
};
