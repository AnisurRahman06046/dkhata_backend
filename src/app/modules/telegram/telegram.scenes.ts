import { Scenes } from 'telegraf';
import { BotContext } from './telegram.middleware';
import { parsePrice } from './telegram.parser';
import { saleService } from '../sale/sale.service';
import { expenseService } from '../expense/expense.service';
import { dailyLedgerService } from '../daily-ledger/daily-ledger.service';
import * as tpl from './telegram.templates';
import logger from '../../utils/logger';

interface WizardSessionData extends Scenes.WizardSessionData {
  productName?: string;
  expenseDesc?: string;
}

type WizardContext = BotContext &
  Scenes.WizardContext<WizardSessionData>;

const md = { parse_mode: 'Markdown' as const };

// ─── ADD SALE WIZARD ─────────────────────────

export const addSaleWizard = new Scenes.WizardScene<WizardContext>(
  'add-sale-wizard',

  async ctx => {
    await ctx.reply(tpl.wizardAskProduct(), md);
    return ctx.wizard.next();
  },

  async ctx => {
    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
      await ctx.reply(tpl.errorInvalidProductName(), md);
      return;
    }

    if (text === '/cancel') {
      await ctx.reply('\u274C Sale cancelled.', md);
      return ctx.scene.leave();
    }

    if (text.startsWith('/')) {
      await ctx.reply(tpl.errorInvalidProductName(), md);
      return;
    }

    const productName = text.trim();
    if (productName.length > 200) {
      await ctx.reply('\u26A0\uFE0F Product name too long. Use a shorter name.', md);
      return;
    }

    ctx.scene.session.productName = productName;
    await ctx.reply(tpl.wizardAskPrice(productName), md);
    return ctx.wizard.next();
  },

  async ctx => {
    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
      await ctx.reply(tpl.errorInvalidPrice(), md);
      return;
    }

    if (text === '/cancel') {
      await ctx.reply('\u274C Sale cancelled.', md);
      return ctx.scene.leave();
    }

    const price = parsePrice(text);
    if (price === null) {
      await ctx.reply(tpl.errorInvalidPrice(), md);
      return;
    }

    const productName = ctx.scene.session.productName;
    if (!productName) {
      await ctx.reply(tpl.errorGeneric(), md);
      return ctx.scene.leave();
    }

    const user = ctx.state.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return ctx.scene.leave();
    }

    try {
      await saleService.createSaleByUserId(user.id, productName, price);
      const balance = await dailyLedgerService.getLiveBalance(user.id);
      await ctx.reply(
        tpl.saleConfirmationWizard(productName, price, balance.currentBalance),
        md,
      );
    } catch (error) {
      logger.error('Failed to create sale in wizard:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }

    return ctx.scene.leave();
  },
);

// ─── ADD EXPENSE WIZARD ─────────────────────────

export const addExpenseWizard = new Scenes.WizardScene<WizardContext>(
  'add-expense-wizard',

  async ctx => {
    await ctx.reply(tpl.wizardAskExpenseDesc(), md);
    return ctx.wizard.next();
  },

  async ctx => {
    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
      await ctx.reply(tpl.errorInvalidProductName(), md);
      return;
    }

    if (text === '/cancel') {
      await ctx.reply('\u274C Expense cancelled.', md);
      return ctx.scene.leave();
    }

    if (text.startsWith('/')) {
      await ctx.reply('\u26A0\uFE0F Please enter a description, not a command.', md);
      return;
    }

    const description = text.trim();
    if (description.length > 200) {
      await ctx.reply('\u26A0\uFE0F Description too long. Use a shorter one.', md);
      return;
    }

    ctx.scene.session.expenseDesc = description;
    await ctx.reply(tpl.wizardAskExpenseAmount(description), md);
    return ctx.wizard.next();
  },

  async ctx => {
    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
      await ctx.reply(tpl.errorInvalidPrice(), md);
      return;
    }

    if (text === '/cancel') {
      await ctx.reply('\u274C Expense cancelled.', md);
      return ctx.scene.leave();
    }

    const amount = parsePrice(text);
    if (amount === null) {
      await ctx.reply(tpl.errorInvalidPrice(), md);
      return;
    }

    const description = ctx.scene.session.expenseDesc;
    if (!description) {
      await ctx.reply(tpl.errorGeneric(), md);
      return ctx.scene.leave();
    }

    const user = ctx.state.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return ctx.scene.leave();
    }

    try {
      await expenseService.createExpense(user.id, description, amount);
      await dailyLedgerService.recordExpense(user.id, amount);
      const balance = await dailyLedgerService.getLiveBalance(user.id);
      await ctx.reply(
        tpl.expenseConfirmationWizard(description, amount, balance.currentBalance),
        md,
      );
    } catch (error) {
      logger.error('Failed to create expense in wizard:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }

    return ctx.scene.leave();
  },
);

// ─── SET BALANCE WIZARD ─────────────────────────

export const setBalanceWizard = new Scenes.WizardScene<WizardContext>(
  'set-balance-wizard',

  async ctx => {
    await ctx.reply(tpl.setBalancePrompt(), md);
    return ctx.wizard.next();
  },

  async ctx => {
    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
      await ctx.reply(tpl.errorInvalidPrice(), md);
      return;
    }

    if (text === '/cancel') {
      await ctx.reply('\u274C Cancelled.', md);
      return ctx.scene.leave();
    }

    const amount = parsePrice(text);
    if (amount === null) {
      await ctx.reply(tpl.errorInvalidPrice(), md);
      return;
    }

    const user = ctx.state.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return ctx.scene.leave();
    }

    try {
      await dailyLedgerService.setInitialBalance(user.id, amount);
      await ctx.reply(tpl.setBalanceSuccess(amount), md);
    } catch (error) {
      logger.error('Failed to set balance:', error);
      await ctx.reply(tpl.errorGeneric(), md);
    }

    return ctx.scene.leave();
  },
);
