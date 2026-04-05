import { z } from 'zod';

export const applyReferralSchema = z.object({
  body: z.object({
    telegramId: z.string().min(1),
    referralCode: z.string().min(1),
  }),
});

export type TApplyReferral = z.infer<typeof applyReferralSchema>['body'];

export const REFERRALS_FOR_FREE_MONTH = 3;
