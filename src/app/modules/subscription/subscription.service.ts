import prisma from '../../../lib/prisma';
import { PlanType } from '../../../../generated/prisma/client';
import logger from '../../utils/logger';

const HIGH_SALES_THRESHOLD = 10000;
const STREAK_TRIGGER_DAYS = 7;

const isProUser = (user: { plan: PlanType; planExpiresAt: Date | null }): boolean => {
  if (user.plan === 'FREE') return false;
  if (!user.planExpiresAt) return false;
  return user.planExpiresAt > new Date();
};

const checkAndUpdateStreak = async (userId: string, todayDateStr: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, lastActiveDate: true },
  });

  if (!user) return { streakDays: 0, isNew: false };

  let newStreak = 1;
  if (user.lastActiveDate) {
    const lastDate = new Date(user.lastActiveDate + 'T00:00:00Z');
    const todayDate = new Date(todayDateStr + 'T00:00:00Z');
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      return { streakDays: user.streakDays, isNew: false };
    } else if (diffDays === 1) {
      newStreak = user.streakDays + 1;
    }
    // diffDays > 1 => streak resets to 1
  }

  await prisma.user.update({
    where: { id: userId },
    data: { streakDays: newStreak, lastActiveDate: todayDateStr },
  });

  return { streakDays: newStreak, isNew: true };
};

interface UpgradeTrigger {
  type: 'streak' | 'high_sales';
  message: string;
}

const checkUpgradeTriggers = async (userId: string, todaySalesTotal: number): Promise<UpgradeTrigger | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, streakDays: true },
  });

  if (!user || isProUser(user)) return null;

  if (user.streakDays === STREAK_TRIGGER_DAYS) {
    return {
      type: 'streak',
      message: `You've used Digital Khata for ${STREAK_TRIGGER_DAYS} days straight! Upgrade to Pro for weekly/monthly reports and Google Sheets sync.`,
    };
  }

  if (todaySalesTotal >= HIGH_SALES_THRESHOLD) {
    return {
      type: 'high_sales',
      message: `Great day! ${todaySalesTotal.toLocaleString()} BDT in sales! Pro users can track weekly & monthly trends. Upgrade now!`,
    };
  }

  return null;
};

const expireExpiredPlans = async () => {
  const now = new Date();
  const result = await prisma.user.updateMany({
    where: {
      plan: { not: 'FREE' },
      planExpiresAt: { lt: now },
    },
    data: {
      plan: 'FREE',
      planExpiresAt: null,
    },
  });

  if (result.count > 0) {
    logger.info(`Expired ${result.count} plan(s)`);
  }
};

const getUserPlanStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, streakDays: true, referralCode: true },
  });

  if (!user) return null;

  const isPro = isProUser(user);
  const daysLeft = user.planExpiresAt
    ? Math.max(0, Math.ceil((user.planExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return {
    plan: user.plan,
    isPro,
    planExpiresAt: user.planExpiresAt,
    daysLeft,
    streakDays: user.streakDays,
    referralCode: user.referralCode,
  };
};

export const subscriptionService = {
  isProUser,
  checkAndUpdateStreak,
  checkUpgradeTriggers,
  expireExpiredPlans,
  getUserPlanStatus,
};
