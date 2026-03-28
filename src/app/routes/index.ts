import { Router } from 'express';
import { userRoutes } from '../modules/user/user.routes';
import { saleRoutes } from '../modules/sale/sale.routes';
import { expenseRoutes } from '../modules/expense/expense.routes';
import { summaryRoutes } from '../modules/summary/summary.routes';

const router = Router();

const moduleRoutes = [
  { path: '/users', route: userRoutes },
  { path: '/sales', route: saleRoutes },
  { path: '/expenses', route: expenseRoutes },
  { path: '/summary', route: summaryRoutes },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
