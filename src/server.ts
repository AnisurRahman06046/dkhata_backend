import { Server } from 'http';
import app from './app';
import config from './app/config';
import logger from './app/utils/logger';
import prisma from './lib/prisma';
import { createBot, startBot, stopBot } from './app/modules/telegram/telegram.bot';
import { googleSheetsService } from './app/modules/google-sheets/google-sheets.service';

let server: Server;

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Stop Telegram bot
        await stopBot();

        // Stop Google Sheets sync
        googleSheetsService.stopPeriodicSync();

        // Close database connection
        await prisma.$disconnect();
        logger.info('Database connection closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
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
    // Verify database connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected successfully');

    // Initialize Telegram bot
    const bot = createBot();

    if (config.telegram.webhookUrl) {
      // Webhook mode: mount callback on Express
      const webhookCallback = await startBot(bot);
      if (webhookCallback) {
        app.use(webhookCallback);
      }
    } else {
      // Long-polling mode: start independently
      await startBot(bot);
    }

    // Start Google Sheets periodic sync
    googleSheetsService.startPeriodicSync();

    // Start HTTP server
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
