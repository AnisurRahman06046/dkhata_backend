import { Router } from 'express';
import { paymentController } from './payment.controller';
import validateRequest from '../../middlewares/validateRequest';
import {
  createPaymentSchema,
  verifyPaymentSchema,
  rejectPaymentSchema,
  listPaymentsQuerySchema,
} from './payment.interface';

const router = Router();

router.post(
  '/',
  validateRequest(createPaymentSchema),
  paymentController.createPayment,
);

router.get(
  '/',
  validateRequest(listPaymentsQuerySchema),
  paymentController.listPayments,
);

router.post(
  '/:id/verify',
  validateRequest(verifyPaymentSchema),
  paymentController.verifyPayment,
);

router.post(
  '/:id/reject',
  validateRequest(rejectPaymentSchema),
  paymentController.rejectPayment,
);

export const paymentRoutes = router;
