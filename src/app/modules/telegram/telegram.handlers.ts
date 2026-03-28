import { Telegraf, Scenes } from 'telegraf';
import { BotContext } from './telegram.middleware';
import { parseSaleInput } from './telegram.parser';
import { userService } from '../user/user.service';
import { saleService } from '../sale/sale.service';
import { summaryService } from '../summary/summary.service';
import logger from '../../utils/logger';

type BotWithScenes = BotContext & Scenes.SceneContext;

const formatDate = (date: Date): string => {
  const bdTime = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  return bdTime.toISOString().replace('T', ' ').substring(0, 16);
};

export const registerHandlers = (bot: Telegraf<BotWithScenes>) => {
  // /start — Register user
  bot.start(async ctx => {
    if (!ctx.from) return;

    const telegramId = String(ctx.from.id);
    const name = ctx.from.first_name || 'User';

    try {
      await userService.findOrCreateByTelegramId(telegramId, name);

      await ctx.reply(
        `Welcome to Digital Khata Bot, ${name}!\n` +
          `Your digital sales diary is ready.\n\n` +
          `Commands:\n` +
          `/addsale - Add a sale step by step\n` +
          `/today - Today's summary\n` +
          `/history - Recent sales\n` +
          `/help - Show all commands\n\n` +
          `Or just type: Product Price\n` +
          `Example: Shirt 500`,
      );
    } catch (error) {
      logger.error('Start command error:', error);
      await ctx.reply('Something went wrong. Please try again.');
    }
  });

  // /addsale — Enter guided wizard
  bot.command('addsale', async ctx => {
    await (ctx as BotWithScenes).scene.enter('add-sale-wizard');
  });

  // /today — Daily summary
  bot.command('today', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply('Please register with /start first.');
      return;
    }

    try {
      const [summary, sales] = await Promise.all([
        summaryService.getSummary(user.id, 'today'),
        summaryService.getSalesListForPeriod(user.id, 'today'),
      ]);

      if (summary.transactionCount === 0) {
        await ctx.reply(
          "Today's Summary\n" +
            '---\n' +
            'No sales recorded yet today.\n\n' +
            'Type "Product Price" to add a sale (e.g., Shirt 500)',
        );
        return;
      }

      let message =
        "Today's Sales Summary\n" +
        '---\n' +
        `Total: ${summary.totalSales} BDT\n` +
        `Transactions: ${summary.transactionCount}\n` +
        '---\n';

      sales.forEach((sale, index) => {
        message += `${index + 1}. ${sale.productName} - ${sale.price} BDT\n`;
      });

      await ctx.reply(message);
    } catch (error) {
      logger.error('Today command error:', error);
      await ctx.reply('Failed to get summary. Please try again.');
    }
  });

  // /history — Recent sales
  bot.command('history', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply('Please register with /start first.');
      return;
    }

    try {
      const result = await saleService.getSalesByUser({
        userId: user.id,
        limit: 10,
      });

      if (result.sales.length === 0) {
        await ctx.reply(
          'No sales recorded yet.\n\n' +
            'Type "Product Price" to add your first sale (e.g., Shirt 500)',
        );
        return;
      }

      let message = `Recent Sales (${result.sales.length} of ${result.total})\n---\n`;

      result.sales.forEach((sale, index) => {
        message += `${index + 1}. ${sale.productName} - ${sale.price} BDT (${formatDate(sale.createdAt)})\n`;
      });

      await ctx.reply(message);
    } catch (error) {
      logger.error('History command error:', error);
      await ctx.reply('Failed to get history. Please try again.');
    }
  });

  // /week — Weekly summary
  bot.command('week', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply('Please register with /start first.');
      return;
    }

    try {
      const summary = await summaryService.getSummary(user.id, 'week');

      await ctx.reply(
        'Weekly Summary (Last 7 days)\n' +
          '---\n' +
          `Total: ${summary.totalSales} BDT\n` +
          `Transactions: ${summary.transactionCount}\n`,
      );
    } catch (error) {
      logger.error('Week command error:', error);
      await ctx.reply('Failed to get weekly summary. Please try again.');
    }
  });

  // /month — Monthly summary
  bot.command('month', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply('Please register with /start first.');
      return;
    }

    try {
      const summary = await summaryService.getSummary(user.id, 'month');

      await ctx.reply(
        'Monthly Summary\n' +
          '---\n' +
          `Total: ${summary.totalSales} BDT\n` +
          `Transactions: ${summary.transactionCount}\n`,
      );
    } catch (error) {
      logger.error('Month command error:', error);
      await ctx.reply('Failed to get monthly summary. Please try again.');
    }
  });

  // /help — Command list
  bot.help(async ctx => {
    await ctx.reply(
      'Digital Khata Bot - Commands\n' +
        '---\n' +
        '/start - Register / restart\n' +
        '/addsale - Add sale step by step\n' +
        '/today - Today\'s summary\n' +
        '/week - Weekly summary\n' +
        '/month - Monthly summary\n' +
        '/history - Recent sales\n' +
        '/help - Show this help\n\n' +
        'Quick Entry:\n' +
        'Just type: Product Price\n' +
        'Examples:\n' +
        '  Shirt 500\n' +
        '  Rice 5kg 350\n' +
        '  Blue Jeans 1200',
    );
  });

  // Text message fallback — Natural language sale entry
  bot.on('text', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply('Please register with /start first.');
      return;
    }

    const text = ctx.message.text;

    // Skip if it looks like a command
    if (text.startsWith('/')) return;

    const parsed = parseSaleInput(text);

    if (!parsed) {
      await ctx.reply(
        'Could not understand your input.\n\n' +
          'To record a sale, type:\n' +
          'Product Price (e.g., Shirt 500)\n\n' +
          'Or use /addsale for step-by-step entry.',
      );
      return;
    }

    try {
      await saleService.createSaleByUserId(
        user.id,
        parsed.productName,
        parsed.price,
      );

      await ctx.reply(
        `Sale Recorded!\n` +
          `Product: ${parsed.productName}\n` +
          `Price: ${parsed.price} BDT`,
      );
    } catch (error) {
      logger.error('Sale entry error:', error);
      await ctx.reply('Failed to record sale. Please try again.');
    }
  });
};
