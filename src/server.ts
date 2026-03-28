import { Server } from 'http';
import app from './app';
import config from './app/config';
import logger from './app/utils/logger';
import prisma from './lib/prisma';
import { createBot, startBot, stopBot, getBotInstance } from './app/modules/telegram/telegram.bot';
import { googleSheetsService } from './app/modules/google-sheets/google-sheets.service';
import { dailyLedgerService } from './app/modules/daily-ledger/daily-ledger.service';
import * as tpl from './app/modules/telegram/telegram.templates';

let server: Server;
let autoCloseIntervalId: ReturnType<typeof setInterval> | null = null;

const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

const getBDHour = (): number => {
  const bd = new Date(Date.now() + BD_OFFSET_MS);
  return bd.getUTCHours();
};

// Runs every 30 minutes. At 11 PM BD sends reminder, at midnight auto-closes.
const startAutoCloseJob = () => {
  autoCloseIntervalId = setInterval(async () => {
    const bdHour = getBDHour();

    try {
      // 11 PM BD — send reminder to users with open ledgers
      if (bdHour === 23) {
        const bot = getBotInstance();
        if (!bot) return;

        const openLedgers = await prisma.dailyLedger.findMany({
          where: {
            date: dailyLedgerService.getBDDateString(),
            isClosed: false,
          },
          include: { user: { select: { telegramId: true } } },
        });

        for (const ledger of openLedgers) {
          try {
            await bot.telegram.sendMessage(
              ledger.user.telegramId,
              tpl.endDayReminder(),
              { parse_mode: 'Markdown' },
            );
          } catch {
            // User may have blocked the bot
          }
        }
      }

      // Midnight BD — auto-close yesterday's open ledgers
      if (bdHour === 0) {
        await dailyLedgerService.autoCloseYesterday();
      }
    } catch (error) {
      logger.error('Auto-close job error:', error);
    }
  }, 30 * 60 * 1000); // Every 30 minutes

  logger.info('Auto-close job started (checks every 30 min)');
};

const stopAutoCloseJob = () => {
  if (autoCloseIntervalId) {
    clearInterval(autoCloseIntervalId);
    autoCloseIntervalId = null;
  }
};

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await stopBot();
        stopAutoCloseJob();
        googleSheetsService.stopPeriodicSync();
        await prisma.$disconnect();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000).unref();
  }
};

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected successfully');

    const bot = createBot();

    if (config.telegram.webhookUrl) {
      const webhookCallback = await startBot(bot);
      if (webhookCallback) {
        app.use(webhookCallback);
      }
    } else {
      await startBot(bot);
    }

    googleSheetsService.startPeriodicSync();
    startAutoCloseJob();

    server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.node_env}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
