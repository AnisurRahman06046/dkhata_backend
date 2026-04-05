import prisma from '../../../lib/prisma';
import { NotFoundError, BadRequestError } from '../../errors';
import { userService } from '../user/user.service';
import { PLAN_PRICES, PLAN_DURATIONS_DAYS, TCreatePayment } from './payment.interface';
import { PaymentStatus, PlanType } from '../../../../generated/prisma/client';

const createPayment = async (data: TCreatePayment) => {
  const user = await userService.getUserByTelegramId(data.telegramId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const amount = PLAN_PRICES[data.planType];

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amount,
      method: data.method,
      transactionId: data.transactionId,
      planType: data.planType as PlanType,
    },
  });

  return payment;
};

const createPaymentByUserId = async (
  userId: string,
  method: 'BKASH' | 'NAGAD',
  transactionId: string,
  planType: 'PRO_MONTHLY' | 'PRO_YEARLY',
) => {
  const amount = PLAN_PRICES[planType];

  const payment = await prisma.payment.create({
    data: {
      userId,
      amount,
      method,
      transactionId,
      planType: planType as PlanType,
    },
  });

  return payment;
};

const verifyPayment = async (paymentId: string, adminTelegramId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status !== 'PENDING') {
    throw new BadRequestError(`Payment already ${payment.status.toLowerCase()}`);
  }

  const durationDays = PLAN_DURATIONS_DAYS[payment.planType as keyof typeof PLAN_DURATIONS_DAYS];
  if (!durationDays) {
    throw new BadRequestError('Invalid plan type');
  }

  const now = new Date();
  const currentExpiry = payment.user.planExpiresAt;
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'VERIFIED',
        verifiedBy: adminTelegramId,
        verifiedAt: now,
      },
    }),
    prisma.user.update({
      where: { id: payment.userId },
      data: {
        plan: payment.planType as PlanType,
        planExpiresAt: expiresAt,
      },
    }),
  ]);

  return { payment: updatedPayment, expiresAt };
};

const rejectPayment = async (paymentId: string, adminTelegramId: string, reason?: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status !== 'PENDING') {
    throw new BadRequestError(`Payment already ${payment.status.toLowerCase()}`);
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'REJECTED',
      verifiedBy: adminTelegramId,
      rejectedReason: reason || 'No reason provided',
    },
  });

  return updated;
};

const getPendingPayments = async (limit = 20, offset = 0) => {
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { telegramId: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
  ]);

  return { payments, total };
};

const getPaymentsByStatus = async (status?: PaymentStatus, limit = 20, offset = 0) => {
  const where = status ? { status } : {};

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { user: { select: { telegramId: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, total };
};

const getUserPayments = async (userId: string) => {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
};

export const paymentService = {
  createPayment,
  createPaymentByUserId,
  verifyPayment,
  rejectPayment,
  getPendingPayments,
  getPaymentsByStatus,
  getUserPayments,
};
