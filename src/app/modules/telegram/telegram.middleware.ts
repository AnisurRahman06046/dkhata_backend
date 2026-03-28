import { Context, MiddlewareFn } from 'telegraf';
import { userService } from '../user/user.service';
import logger from '../../utils/logger';

export interface BotContext extends Context {
  state: {
    user?: {
      id: string;
      telegramId: string;
      name: string;
      language: string;
    };
  };
}

export const authMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (!ctx.from) {
    return;
  }

  const telegramId = String(ctx.from.id);

  try {
    const user = await userService.getUserByTelegramId(telegramId);

    if (user) {
      ctx.state = ctx.state || {};
      ctx.state.user = {
        id: user.id,
        telegramId: user.telegramId,
        name: user.name,
        language: user.language,
      };
      return next();
    }

    // Allow /start command for unregistered users
    const messageText =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (messageText.startsWith('/start')) {
      return next();
    }

    await ctx.reply(
      'Please use /start to register first before using the bot.',
    );
  } catch (error) {
    logger.error('Auth middleware error:', error);
    await ctx.reply('Something went wrong. Please try again.');
  }
};
