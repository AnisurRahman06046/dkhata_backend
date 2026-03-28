import { Router } from 'express';
import { expenseController } from './expense.controller';
import validateRequest from '../../middlewares/validateRequest';
import {
  createExpenseSchema,
  getExpensesQuerySchema,
  deleteExpenseParamsSchema,
} from './expense.interface';

const router = Router();

router.post(
  '/',
  validateRequest(createExpenseSchema),
  expenseController.createExpense,
);

router.get(
  '/',
  validateRequest(getExpensesQuerySchema),
  expenseController.getExpenses,
);

router.delete(
  '/:id',
  validateRequest(deleteExpenseParamsSchema),
  expenseController.deleteExpense,
);

export { router as expenseRoutes };
