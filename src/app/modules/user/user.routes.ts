import { Router } from 'express';
import { userController } from './user.controller';
import validateRequest from '../../middlewares/validateRequest';
import {
  createUserSchema,
  updateUserSchema,
  getUserParamsSchema,
} from './user.interface';

const router = Router();

router.post(
  '/',
  validateRequest(createUserSchema),
  userController.createUser,
);

router.get(
  '/:telegramId',
  validateRequest(getUserParamsSchema),
  userController.getUser,
);

router.patch(
  '/:telegramId',
  validateRequest(updateUserSchema),
  userController.updateUser,
);

export { router as userRoutes };
