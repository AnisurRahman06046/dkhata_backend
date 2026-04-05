import { Telegraf, Scenes } from 'telegraf';
import { BotContext } from './telegram.middleware';
import { parseInput } from './telegram.parser';
import { userService } from '../user/user.service';
import { saleService } from '../sale/sale.service';
import { expenseService } from '../expense/expense.service';
import { summaryService } from '../summary/summary.service';
import { dailyLedgerService } from '../daily-ledger/daily-ledger.service';
import { paymentService } from '../payment/payment.service';
import { referralService } from '../referral/referral.service';
import { subscriptionService } from '../subscription/subscription.service';
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
      const user = await userService.findOrCreateByTelegramId(telegramId, name);

      // Parse deep link payload: phone_880XXXXXXXXXX
      const payload = (ctx as unknown as { startPayload?: string }).startPayload;
      if (payload) {
        const phoneMatch = payload.match(/^phone_(\d{10,13})$/);
        if (phoneMatch && !user.phone) {
          const phone = phoneMatch[1];
          await userService.updateUser(telegramId, { phone });
        }
      }

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

  // ─── /week (PRO) ──────────────────────
  bot.command('week', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    if (!user.isPro) {
      await ctx.reply(tpl.proFeatureLocked('Weekly Report'), md);
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

  // ─── /month (PRO) ─────────────────────
  bot.command('month', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    if (!user.isPro) {
      await ctx.reply(tpl.proFeatureLocked('Monthly Report'), md);
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

  // ─── /subscribe ────────────────────────
  bot.command('subscribe', async ctx => {
    await ctx.reply(tpl.subscribeMessage(), md);
  });

  // ─── /mystatus ─────────────────────────
  bot.command('mystatus', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    try {
      const status = await subscriptionService.getUserPlanStatus(user.id);
      if (!status) {
        await ctx.reply(tpl.errorGeneric(), md);
        return;
      }
      await ctx.reply(tpl.planStatusMessage(status), md);
    } catch (error) {
      logger.error('Mystatus error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /referral ─────────────────────────
  bot.command('referral', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    try {
      const stats = await referralService.getReferralStats(user.id);
      await ctx.reply(tpl.referralMessage(stats), md);
    } catch (error) {
      logger.error('Referral error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── /refer <code> ────────────────────
  bot.command('refer', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    const text = ctx.message?.text || '';
    const parts = text.split(/\s+/);
    const code = parts[1];

    if (!code) {
      await ctx.reply('\u26A0\uFE0F Usage: `/refer <referral_code>`', md);
      return;
    }

    try {
      await referralService.applyReferral(user.telegramId, code);
      const referrer = await referralService.getReferrerByCode(code);
      await ctx.reply(tpl.referralApplied(referrer?.name || 'Someone'), md);
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(`\u26A0\uFE0F ${error.message}`, md);
      } else {
        await ctx.reply(tpl.errorGeneric(), md);
      }
    }
  });

  // ─── /pay <method> <txn_id> <plan> ────
  bot.command('pay', async ctx => {
    const user = ctx.state?.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return;
    }

    const text = ctx.message?.text || '';
    const parts = text.split(/\s+/);

    if (parts.length < 4) {
      await ctx.reply(
        '\u26A0\uFE0F Usage: `/pay bkash TXN123 monthly`\n' +
        'or: `/pay nagad TXN456 yearly`',
        md,
      );
      return;
    }

    const methodRaw = parts[1].toUpperCase();
    const txnId = parts[2];
    const planRaw = parts[3].toLowerCase();

    if (methodRaw !== 'BKASH' && methodRaw !== 'NAGAD') {
      await ctx.reply('\u26A0\uFE0F Payment method must be `bkash` or `nagad`', md);
      return;
    }

    const planType = planRaw === 'yearly' ? 'PRO_YEARLY' : 'PRO_MONTHLY';

    try {
      await paymentService.createPaymentByUserId(
        user.id,
        methodRaw as 'BKASH' | 'NAGAD',
        txnId,
        planType,
      );
      const planLabel = planType === 'PRO_YEARLY' ? 'Pro Yearly (1,499 BDT)' : 'Pro Monthly (199 BDT)';
      await ctx.reply(tpl.paymentSubmitted(methodRaw, txnId, planLabel), md);
    } catch (error) {
      logger.error('Pay command error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── ADMIN: /admin_payments ────────────
  bot.command('admin_payments', async ctx => {
    if (!ctx.state?.isAdmin) {
      await ctx.reply(tpl.adminUnauthorized(), md);
      return;
    }

    try {
      const result = await paymentService.getPendingPayments();
      await ctx.reply(tpl.adminPaymentsList(result.payments as Parameters<typeof tpl.adminPaymentsList>[0], result.total), md);
    } catch (error) {
      logger.error('Admin payments error:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }
  });

  // ─── ADMIN: /admin_verify <id> ────────
  bot.command('admin_verify', async ctx => {
    if (!ctx.state?.isAdmin) {
      await ctx.reply(tpl.adminUnauthorized(), md);
      return;
    }

    const text = ctx.message?.text || '';
    const parts = text.split(/\s+/);
    const paymentId = parts[1];

    if (!paymentId) {
      await ctx.reply('\u26A0\uFE0F Usage: `/admin_verify <payment_id>`', md);
      return;
    }

    try {
      // Find full payment ID from short ID
      const { payments } = await paymentService.getPendingPayments(100);
      const payment = payments.find(p => p.id.startsWith(paymentId));

      if (!payment) {
        await ctx.reply('\u26A0\uFE0F Payment not found.', md);
        return;
      }

      const adminTelegramId = String(ctx.from!.id);
      const result = await paymentService.verifyPayment(payment.id, adminTelegramId);

      await ctx.reply(
        tpl.adminVerified(
          (payment as { user: { name: string } }).user.name,
          payment.planType,
        ),
        md,
      );

      // Notify user
      try {
        const user = (payment as { user: { telegramId: string } }).user;
        await ctx.telegram.sendMessage(
          user.telegramId,
          tpl.paymentVerifiedUser(
            payment.planType === 'PRO_YEARLY' ? 'Pro Yearly' : 'Pro Monthly',
            result.expiresAt,
          ),
          md,
        );
      } catch {
        // User may have blocked bot
      }
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(`\u26A0\uFE0F ${error.message}`, md);
      } else {
        await ctx.reply(tpl.errorGeneric(), md);
      }
    }
  });

  // ─── ADMIN: /admin_reject <id> [reason] ─
  bot.command('admin_reject', async ctx => {
    if (!ctx.state?.isAdmin) {
      await ctx.reply(tpl.adminUnauthorized(), md);
      return;
    }

    const text = ctx.message?.text || '';
    const parts = text.split(/\s+/);
    const paymentId = parts[1];
    const reason = parts.slice(2).join(' ') || 'No reason provided';

    if (!paymentId) {
      await ctx.reply('\u26A0\uFE0F Usage: `/admin_reject <payment_id> [reason]`', md);
      return;
    }

    try {
      const { payments } = await paymentService.getPendingPayments(100);
      const payment = payments.find(p => p.id.startsWith(paymentId));

      if (!payment) {
        await ctx.reply('\u26A0\uFE0F Payment not found.', md);
        return;
      }

      const adminTelegramId = String(ctx.from!.id);
      await paymentService.rejectPayment(payment.id, adminTelegramId, reason);

      await ctx.reply(
        tpl.adminRejected(
          (payment as { user: { name: string } }).user.name,
          reason,
        ),
        md,
      );

      // Notify user
      try {
        const user = (payment as { user: { telegramId: string } }).user;
        await ctx.telegram.sendMessage(
          user.telegramId,
          tpl.paymentRejected(reason),
          md,
        );
      } catch {
        // User may have blocked bot
      }
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(`\u26A0\uFE0F ${error.message}`, md);
      } else {
        await ctx.reply(tpl.errorGeneric(), md);
      }
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
        let reply = tpl.saleConfirmation(productName, price, balance.currentBalance);

        // Streak + upgrade trigger (fire-and-forget)
        const dateStr = dailyLedgerService.getBDDateString();
        await subscriptionService.checkAndUpdateStreak(user.id, dateStr);

        if (!user.isPro) {
          const trigger = await subscriptionService.checkUpgradeTriggers(
            user.id,
            balance.totalSales,
          );
          if (trigger) {
            reply += tpl.upgradeNudge(trigger.message);
          }
        }

        await ctx.reply(reply, md);
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
