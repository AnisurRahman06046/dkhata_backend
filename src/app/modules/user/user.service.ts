import prisma from '../../../lib/prisma';
import { NotFoundError } from '../../errors';
import { TCreateUser, TUpdateUser } from './user.interface';

const findOrCreateByTelegramId = async (
  telegramId: string,
  name: string,
) => {
  const user = await prisma.user.upsert({
    where: { telegramId },
    update: { name },
    create: { telegramId, name },
  });

  return user;
};

const getUserByTelegramId = async (telegramId: string) => {
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  return user;
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

const createUser = async (data: TCreateUser) => {
  const user = await prisma.user.create({
    data: {
      telegramId: data.telegramId,
      name: data.name,
      phone: data.phone,
      language: data.language,
    },
  });

  return user;
};

const updateUser = async (telegramId: string, data: TUpdateUser) => {
  const existing = await getUserByTelegramId(telegramId);
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  const user = await prisma.user.update({
    where: { telegramId },
    data,
  });

  return user;
};

export const userService = {
  findOrCreateByTelegramId,
  getUserByTelegramId,
  getUserById,
  createUser,
  updateUser,
};
