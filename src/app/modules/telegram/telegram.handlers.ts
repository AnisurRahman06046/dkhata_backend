import { Telegraf, Scenes } from 'telegraf';
import { BotContext } from './telegram.middleware';
import { parseInput } from './telegram.parser';
import { userService } from '../user/user.service';
import { saleService } from '../sale/sale.service';
import { expenseService } from '../expense/expense.service';
import { summaryService } from '../summary/summary.service';
import { dailyLedgerService } from '../daily-ledger/daily-ledger.service';
import * as tpl from './telegram.templates';
import logger from '../../utils/logger';

type BotWithScenes = BotContext & Scenes.SceneContext;

const md = { parse_mode: 'Markdown' as const };

export const registerHandlers = (bot: Telegraf<BotWithScenes>) => {
  // ─── /start ────────────────────────────
  bot.start(async ctx => {
    if (!ctx.from) return;

    const telegramId = String(ctx.from.id);
    const name = ctx.from.first_name || 'User';

    try {
      await userService.findOrCreateByTelegramId(telegramId, name);
      await ctx.reply(tpl.welcomeMessage(name), md);
    } catch (error) {
      logger.error('Start command error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /addsale ──────────────────────────
  bot.command('addsale', async ctx => {
    await (ctx as BotWithScenes).scene.enter('add-sale-wizard');
  });

  // ─── /expense or /addexpense ───────────
  bot.command('expense', async ctx => {
    await (ctx as BotWithScenes).scene.enter('add-expense-wizard');
  });
  bot.command('addexpense', async ctx => {
    await (ctx as BotWithScenes).scene.enter('add-expense-wizard');
  });

  // ─── /setbalance ───────────────────────
  bot.command('setbalance', async ctx => {
    await (ctx as BotWithScenes).scene.enter('set-balance-wizard');
  });

  // ─── /balance ──────────────────────────
  bot.command('balance', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    try {
      const balance = await dailyLedgerService.getLiveBalance(user.id);
      await ctx.reply(tpl.balanceMessage(balance), md);
    } catch (error) {
      logger.error('Balance command error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /today ────────────────────────────
  bot.command('today', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    try {
      const [summary, sales, expenses] = await Promise.all([
        summaryService.getSummary(user.id, 'today'),
        summaryService.getSalesListForPeriod(user.id, 'today'),
        summaryService.getExpensesListForPeriod(user.id, 'today'),
      ]);

      if (summary.transactionCount === 0 && summary.expenseCount === 0) {
        await ctx.reply(tpl.todaySummaryEmpty(summary.openingBalance), md);
        return;
      }

      await ctx.reply(tpl.todaySummary(summary, sales, expenses), md);
    } catch (error) {
      logger.error('Today command error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /history ──────────────────────────
  bot.command('history', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    try {
      const [salesResult, expensesResult] = await Promise.all([
        saleService.getSalesByUser({ userId: user.id, limit: 10 }),
        expenseService.getExpensesByUser({ userId: user.id, limit: 10 }),
      ]);

      const total = salesResult.total + expensesResult.total;

      if (total === 0) {
        await ctx.reply(tpl.historyEmpty(), md);
        return;
      }

      // Merge and sort by date descending
      const transactions = [
        ...salesResult.sales.map(s => ({
          type: 'sale' as const,
          name: s.productName,
          amount: Number(s.price),
          createdAt: s.createdAt,
          id: s.id,
        })),
        ...expensesResult.expenses.map(e => ({
          type: 'expense' as const,
          name: e.description,
          amount: Number(e.amount),
          createdAt: e.createdAt,
          id: e.id,
        })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
       .slice(0, 15);

      await ctx.reply(tpl.historyList(transactions, total), md);
    } catch (error) {
      logger.error('History command error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /week ─────────────────────────────
  bot.command('week', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    try {
      const summary = await summaryService.getSummary(user.id, 'week');
      await ctx.reply(
        tpl.periodSummary(summary, 'Weekly Report', '\uD83D\uDCC5'),
        md,
      );
    } catch (error) {
      logger.error('Week command error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /month ────────────────────────────
  bot.command('month', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    try {
      const summary = await summaryService.getSummary(user.id, 'month');
      await ctx.reply(
        tpl.periodSummary(summary, 'Monthly Report', '\uD83D\uDCC6'),
        md,
      );
    } catch (error) {
      logger.error('Month command error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /endday ───────────────────────────
  bot.command('endday', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    try {
      const result = await dailyLedgerService.endDay(user.id);
      await ctx.reply(tpl.endDayMessage(result), md);
    } catch (error) {
      logger.error('Endday command error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /delete ───────────────────────────
  bot.command('delete', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    try {
      // Find the most recent sale or expense for today
      const [salesResult, expensesResult] = await Promise.all([
        saleService.getTodaySales(user.id),
        expenseService.getExpensesByUser({
          userId: user.id,
          limit: 1,
        }),
      ]);

      const lastSale = salesResult.sales[0];
      const lastExpense = expensesResult.expenses[0];

      if (!lastSale && !lastExpense) {
        await ctx.reply(tpl.deleteNothing(), md);
        return;
      }

      // Delete whichever is more recent
      let type: 'sale' | 'expense';
      let name: string;
      let amount: number;

      const saleTime = lastSale ? lastSale.createdAt.getTime() : 0;
      const expenseTime = lastExpense ? lastExpense.createdAt.getTime() : 0;

      if (saleTime >= expenseTime && lastSale) {
        await saleService.deleteSale(lastSale.id, user.id);
        type = 'sale';
        name = lastSale.productName;
        amount = Number(lastSale.price);
      } else if (lastExpense) {
        await expenseService.deleteExpense(lastExpense.id, user.id);
        await dailyLedgerService.undoExpense(user.id, Number(lastExpense.amount));
        type = 'expense';
        name = lastExpense.description;
        amount = Number(lastExpense.amount);
      } else {
        await ctx.reply(tpl.deleteNothing(), md);
        return;
      }

      const balance = await dailyLedgerService.getLiveBalance(user.id);
      await ctx.reply(
        tpl.deleteConfirmation(type, name, amount, balance.currentBalance),
        md,
      );
    } catch (error) {
      logger.error('Delete command error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /help ─────────────────────────────
  bot.help(async ctx => {
    await ctx.reply(tpl.helpMessage(), md);
  });

  // ─── Text fallback (quick sale or expense) ──
  bot.on('text', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    const parsed = parseInput(text);

    if (!parsed) {
      await ctx.reply(tpl.errorInvalidInput(), md);
      return;
    }

    try {
      if (parsed.type === 'sale') {
        const { productName, price } = parsed.data;
        await saleService.createSaleByUserId(user.id, productName, price);
        const balance = await dailyLedgerService.getLiveBalance(user.id);
        await ctx.reply(
          tpl.saleConfirmation(productName, price, balance.currentBalance),
          md,
        );
      } else {
        const { description, amount } = parsed.data;
        await expenseService.createExpense(user.id, description, amount);
        await dailyLedgerService.recordExpense(user.id, amount);
        const balance = await dailyLedgerService.getLiveBalance(user.id);
        await ctx.reply(
          tpl.expenseConfirmation(description, amount, balance.currentBalance),
          md,
        );
      }
    } catch (error) {
      logger.error('Entry error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });
};
