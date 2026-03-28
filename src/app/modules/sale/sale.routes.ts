import { Router } from 'express';
import { saleController } from './sale.controller';
import validateRequest from '../../middlewares/validateRequest';
import {
  createSaleSchema,
  getSalesQuerySchema,
  deleteSaleParamsSchema,
} from './sale.interface';

const router = Router();

router.post(
  '/',
  validateRequest(createSaleSchema),
  saleController.createSale,
);

router.get(
  '/',
  validateRequest(getSalesQuerySchema),
  saleController.getSales,
);

router.delete(
  '/:id',
  validateRequest(deleteSaleParamsSchema),
  saleController.deleteSale,
);

export { router as saleRoutes };
