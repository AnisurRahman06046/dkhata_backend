import prisma from '../../../lib/prisma';
import { BadRequestError, NotFoundError } from '../../errors';
import { REFERRALS_FOR_FREE_MONTH } from './referral.interface';
import { PlanType } from '../../../../generated/prisma/client';

const applyReferral = async (referredTelegramId: string, referralCode: string) => {
  const referrer = await prisma.user.findUnique({
    where: { referralCode },
  });

  if (!referrer) {
    throw new NotFoundError('Invalid referral code');
  }

  const referred = await prisma.user.findUnique({
    where: { telegramId: referredTelegramId },
  });

  if (!referred) {
    throw new NotFoundError('User not found');
  }

  if (referrer.id === referred.id) {
    throw new BadRequestError('You cannot refer yourself');
  }

  const existing = await prisma.referral.findUnique({
    where: {
      referrerId_referredId: {
        referrerId: referrer.id,
        referredId: referred.id,
      },
    },
  });

  if (existing) {
    throw new BadRequestError('Referral already applied');
  }

  const referral = await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      referredId: referred.id,
    },
  });

  // Check if referrer qualifies for free month
  await checkAndRewardReferrer(referrer.id);

  return referral;
};

const checkAndRewardReferrer = async (referrerId: string) => {
  const unrewardedCount = await prisma.referral.count({
    where: { referrerId, rewarded: false },
  });

  if (unrewardedCount >= REFERRALS_FOR_FREE_MONTH) {
    const unrewarded = await prisma.referral.findMany({
      where: { referrerId, rewarded: false },
      take: REFERRALS_FOR_FREE_MONTH,
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const user = await prisma.user.findUnique({ where: { id: referrerId } });
    if (!user) return;

    const currentExpiry = user.planExpiresAt;
    const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const expiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: referrerId },
        data: {
          plan: PlanType.PRO_MONTHLY,
          planExpiresAt: expiresAt,
        },
      }),
      ...unrewarded.map(r =>
        prisma.referral.update({
          where: { id: r.id },
          data: { rewarded: true },
        }),
      ),
    ]);
  }
};

const getReferralStats = async (userId: string) => {
  const [totalReferrals, unrewardedCount, user] = await Promise.all([
    prisma.referral.count({ where: { referrerId: userId } }),
    prisma.referral.count({ where: { referrerId: userId, rewarded: false } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    }),
  ]);

  return {
    referralCode: user?.referralCode || '',
    totalReferrals,
    unrewardedCount,
    referralsNeeded: Math.max(0, REFERRALS_FOR_FREE_MONTH - unrewardedCount),
  };
};

const getReferrerByCode = async (referralCode: string) => {
  return prisma.user.findUnique({
    where: { referralCode },
    select: { id: true, name: true, telegramId: true },
  });
};

export const referralService = {
  applyReferral,
  getReferralStats,
  getReferrerByCode,
};
