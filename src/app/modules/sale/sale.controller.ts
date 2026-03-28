import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendApiResponse from '../../utils/sendApiResponse';
import { saleService } from './sale.service';
import { userService } from '../user/user.service';
import { NotFoundError } from '../../errors';

const createSale = catchAsync(async (req, res) => {
  const { telegramId, productName, price, quantity } = req.body;

  const sale = await saleService.createSale(
    telegramId,
    productName,
    price,
    quantity,
  );

  sendApiResponse(res, httpStatus.CREATED, 'Sale recorded successfully', sale);
});

const getSales = catchAsync(async (req, res) => {
  const { telegramId, startDate, endDate, limit, offset } = req.query;

  const user = await userService.getUserByTelegramId(telegramId as string);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const result = await saleService.getSalesByUser({
    userId: user.id,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  });

  sendApiResponse(res, httpStatus.OK, 'Sales retrieved successfully', result);
});

const deleteSale = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { telegramId } = req.query;

  const user = await userService.getUserByTelegramId(telegramId as string);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const sale = await saleService.deleteSale(id, user.id);

  sendApiResponse(res, httpStatus.OK, 'Sale deleted successfully', sale);
});

export const saleController = {
  createSale,
  getSales,
  deleteSale,
};
