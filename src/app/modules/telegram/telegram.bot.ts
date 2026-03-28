import { Telegraf, Scenes, session } from 'telegraf';
import config from '../../config';
import { BotContext, authMiddleware } from './telegram.middleware';
import { addSaleWizard } from './telegram.scenes';
import { registerHandlers } from './telegram.handlers';
import logger from '../../utils/logger';

type BotWithScenes = BotContext & Scenes.SceneContext;

let botInstance: Telegraf<BotWithScenes> | null = null;

export const createBot = (): Telegraf<BotWithScenes> => {
  if (botInstance) return botInstance;

  const bot = new Telegraf<BotWithScenes>(config.telegram.botToken);

  // Session middleware for wizard scenes
  bot.use(session());

  // Auth middleware — ensure user exists before processing
  bot.use(authMiddleware as Parameters<typeof bot.use>[0]);

  // Scene stage — register wizard scenes
  const stage = new Scenes.Stage<BotWithScenes>([
    addSaleWizard as unknown as Scenes.BaseScene<BotWithScenes>,
  ]);
  bot.use(stage.middleware());

  // Register all command and message handlers
  registerHandlers(bot);

  // Error handler — prevent bot crash on unhandled errors
  bot.catch((error, ctx) => {
    logger.error(`Bot error for ${ctx.updateType}:`, error);
  });

  botInstance = bot;
  return bot;
};

export const startBot = async (bot: Telegraf<BotWithScenes>) => {
  if (config.telegram.webhookUrl) {
    const webhookPath = '/telegram-webhook';
    const webhookUrl = `${config.telegram.webhookUrl}${webhookPath}`;

    await bot.telegram.setWebhook(webhookUrl);
    logger.info(`Telegram webhook set to: ${webhookUrl}`);

    return bot.webhookCallback(webhookPath);
  }

  // Long-polling mode for development
  await bot.launch({
    dropPendingUpdates: true,
  });
  logger.info('Telegram bot started in long-polling mode');
};

export const stopBot = async () => {
  if (botInstance) {
    botInstance.stop('SIGTERM');
    botInstance = null;
    logger.info('Telegram bot stopped');
  }
};

export const getBotInstance = () => botInstance;
