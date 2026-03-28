import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendApiResponse from '../../utils/sendApiResponse';
import { userService } from './user.service';

const createUser = catchAsync(async (req, res) => {
  const { telegramId, name, phone, language } = req.body;

  const user = await userService.createUser({
    telegramId,
    name,
    phone,
    language,
  });

  sendApiResponse(res, httpStatus.CREATED, 'User created successfully', user);
});

const getUser = catchAsync(async (req, res) => {
  const { telegramId } = req.params;

  const user = await userService.getUserByTelegramId(telegramId);

  if (!user) {
    sendApiResponse(res, httpStatus.NOT_FOUND, 'User not found', null);
    return;
  }

  sendApiResponse(res, httpStatus.OK, 'User retrieved successfully', user);
});

const updateUser = catchAsync(async (req, res) => {
  const { telegramId } = req.params;

  const user = await userService.updateUser(telegramId, req.body);

  sendApiResponse(res, httpStatus.OK, 'User updated successfully', user);
});

export const userController = {
  createUser,
  getUser,
  updateUser,
};
