import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendApiResponse from '../../utils/sendApiResponse';
import { paymentService } from './payment.service';
import { TCreatePayment, TListPaymentsQuery } from './payment.interface';
import { PaymentStatus } from '../../../../generated/prisma/client';

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const data = req.body as TCreatePayment;
  const payment = await paymentService.createPayment(data);

  sendApiResponse(res, 201, 'Payment submitted. Awaiting admin verification.', payment);
});

const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminTelegramId = req.headers['x-admin-telegram-id'] as string || 'api';
  const result = await paymentService.verifyPayment(id, adminTelegramId);

  sendApiResponse(res, 200, 'Payment verified and plan activated.', result);
});

const rejectPayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminTelegramId = req.headers['x-admin-telegram-id'] as string || 'api';
  const reason = req.body?.reason;
  const payment = await paymentService.rejectPayment(id, adminTelegramId, reason);

  sendApiResponse(res, 200, 'Payment rejected.', payment);
});

const listPayments = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as TListPaymentsQuery;
  const result = await paymentService.getPaymentsByStatus(
    query.status as PaymentStatus | undefined,
    query.limit || 20,
    query.offset || 0,
  );

  sendApiResponse(res, 200, 'Payments retrieved.', result);
});

export const paymentController = {
  createPayment,
  verifyPayment,
  rejectPayment,
  listPayments,
};
