import { Router } from 'express';
import { summaryController } from './summary.controller';
import validateRequest from '../../middlewares/validateRequest';
import { summaryQuerySchema } from './summary.interface';

const router = Router();

router.get(
  '/today',
  summaryController.getTodaySummary,
);

router.get(
  '/',
  validateRequest(summaryQuerySchema),
  summaryController.getSummary,
);

export { router as summaryRoutes };
