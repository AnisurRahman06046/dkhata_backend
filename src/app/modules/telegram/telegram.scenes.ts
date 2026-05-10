import { Scenes, Markup } from 'telegraf';
import { BotContext } from './telegram.middleware';
import { parsePrice } from './telegram.parser';
import { saleService } from '../sale/sale.service';
import { expenseService } from '../expense/expense.service';
import { dailyLedgerService } from '../daily-ledger/daily-ledger.service';
import * as tpl from './telegram.templates';
import { UserMode } from '../../../../generated/prisma/client';
import logger from '../../utils/logger';

interface WizardSessionData extends Scenes.WizardSessionData {
  productName?: string;
  expenseDesc?: string;
  amount?: number;
}

type WizardContext = BotContext & Scenes.WizardContext<WizardSessionData>;

const md = { parse_mode: 'Markdown' as const };

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const buildCategoryKeyboard = (categories: string[]) => {
  const unique = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)));
  const buttons = unique.map(c =>
    Markup.button.callback(c, `cat:${encodeURIComponent(c)}`),
  );
  const rows = chunk(buttons, 2);
  rows.push([Markup.button.callback('\u23ED Skip', 'cat:__skip__')]);
  return Markup.inlineKeyboard(rows);
};

const getIncomeCategories = async (userId: string): Promise<string[]> => {
  const used = await saleService.getUserCategories(userId);
  return [...tpl.PERSONAL_INCOME_CATEGORIES, ...used];
};

const getExpenseCategories = async (userId: string): Promise<string[]> => {
  const used = await expenseService.getUserCategories(userId);
  return [...tpl.PERSONAL_EXPENSE_CATEGORIES, ...used];
};

const finalizeSale = async (
  ctx: WizardContext,
  userId: string,
  productName: string,
  price: number,
  mode: UserMode | null | undefined,
  category: string | null,
) => {
  await saleService.createSaleByUserId(
    userId,
    productName,
    price,
    1,
    category ?? undefined,
  );
  const balance = await dailyLedgerService.getLiveBalance(userId);
  await ctx.reply(
    tpl.saleConfirmationWizard(
      productName,
      price,
      balance.currentBalance,
      mode ?? undefined,
      category,
    ),
    md,
  );
};

const finalizeExpense = async (
  ctx: WizardContext,
  userId: string,
  description: string,
  amount: number,
  mode: UserMode | null | undefined,
  category: string | null,
) => {
  await expenseService.createExpense(
    userId,
    description,
    amount,
    category ?? undefined,
  );
  await dailyLedgerService.recordExpense(userId, amount);
  const balance = await dailyLedgerService.getLiveBalance(userId);
  await ctx.reply(
    tpl.expenseConfirmationWizard(
      description,
      amount,
      balance.currentBalance,
      mode ?? undefined,
      category,
    ),
    md,
  );
};

// ─── ADD SALE / INCOME WIZARD ─────────────────────────

export const addSaleWizard = new Scenes.WizardScene<WizardContext>(
  'add-sale-wizard',

  async ctx => {
    const mode = ctx.state.user?.mode ?? undefined;
    await ctx.reply(tpl.wizardAskProduct(mode), md);
    return ctx.wizard.next();
  },

  async ctx => {
    const mode = ctx.state.user?.mode ?? undefined;
    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
      await ctx.reply(tpl.errorInvalidProductName(mode), md);
      return;
    }

    if (text === '/cancel') {
      await ctx.reply('\u274C Cancelled.', md);
      return ctx.scene.leave();
    }

    if (text.startsWith('/')) {
      await ctx.reply(tpl.errorInvalidProductName(mode), md);
      return;
    }

    const productName = text.trim();
    if (productName.length > 200) {
      await ctx.reply('\u26A0\uFE0F Name too long. Use a shorter one.', md);
      return;
    }

    ctx.scene.session.productName = productName;
    await ctx.reply(tpl.wizardAskPrice(productName, mode), md);
    return ctx.wizard.next();
  },

  async ctx => {
    const user = ctx.state.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return ctx.scene.leave();
    }
    const mode = user.mode ?? undefined;

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

    // Shop mode: finalize immediately.
    if (mode !== 'PERSONAL') {
      try {
        await finalizeSale(ctx, user.id, productName, price, mode, null);
      } catch (error) {
        logger.error('Failed to create sale in wizard:', error);
        await ctx.reply(tpl.errorGeneric(), md);
      }
      return ctx.scene.leave();
    }

    // Personal mode: ask for category.
    ctx.scene.session.amount = price;
    const cats = await getIncomeCategories(user.id);
    await ctx.reply(tpl.wizardAskCategory('income'), {
      ...md,
      ...buildCategoryKeyboard(cats),
    });
    return ctx.wizard.next();
  },

  // Step 4: category selection (PERSONAL mode only)
  async ctx => {
    const user = ctx.state.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return ctx.scene.leave();
    }
    const mode = user.mode ?? undefined;
    const productName = ctx.scene.session.productName;
    const price = ctx.scene.session.amount;
    if (!productName || price === undefined) {
      await ctx.reply(tpl.errorGeneric(), md);
      return ctx.scene.leave();
    }

    let category: string | null = null;

    if ('callback_query' in (ctx.update as object)) {
      const cb = (ctx.update as { callback_query?: { data?: string } }).callback_query;
      const data = cb?.data || '';
      if (data.startsWith('cat:')) {
        const raw = decodeURIComponent(data.slice(4));
        category = raw === '__skip__' ? null : raw;
        await ctx.answerCbQuery(category ? `Category: ${category}` : 'Skipped');
        try {
          await ctx.editMessageReplyMarkup(undefined);
        } catch {
          // ignore
        }
      }
    } else if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text.trim();
      if (text === '/cancel') {
        await ctx.reply('\u274C Cancelled.', md);
        return ctx.scene.leave();
      }
      if (text.startsWith('/')) {
        await ctx.reply('\u26A0\uFE0F Please pick a category or tap Skip.', md);
        return;
      }
      if (text.length > 50) {
        await ctx.reply('\u26A0\uFE0F Category name too long (max 50 chars).', md);
        return;
      }
      category = text.toLowerCase();
    } else {
      return;
    }

    try {
      await finalizeSale(ctx, user.id, productName, price, mode, category);
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
    const mode = ctx.state.user?.mode ?? undefined;
    await ctx.reply(tpl.wizardAskExpenseDesc(mode), md);
    return ctx.wizard.next();
  },

  async ctx => {
    const mode = ctx.state.user?.mode ?? undefined;
    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
      await ctx.reply(tpl.errorInvalidProductName(mode), md);
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
    const user = ctx.state.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return ctx.scene.leave();
    }
    const mode = user.mode ?? undefined;

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

    if (mode !== 'PERSONAL') {
      try {
        await finalizeExpense(ctx, user.id, description, amount, mode, null);
      } catch (error) {
        logger.error('Failed to create expense in wizard:', error);
        await ctx.reply(tpl.errorGeneric(), md);
      }
      return ctx.scene.leave();
    }

    ctx.scene.session.amount = amount;
    const cats = await getExpenseCategories(user.id);
    await ctx.reply(tpl.wizardAskCategory('expense'), {
      ...md,
      ...buildCategoryKeyboard(cats),
    });
    return ctx.wizard.next();
  },

  // Step 4: category selection (PERSONAL mode only)
  async ctx => {
    const user = ctx.state.user;
    if (!user) {
      await ctx.reply(tpl.errorNotRegistered(), md);
      return ctx.scene.leave();
    }
    const mode = user.mode ?? undefined;
    const description = ctx.scene.session.expenseDesc;
    const amount = ctx.scene.session.amount;
    if (!description || amount === undefined) {
      await ctx.reply(tpl.errorGeneric(), md);
      return ctx.scene.leave();
    }

    let category: string | null = null;

    if ('callback_query' in (ctx.update as object)) {
      const cb = (ctx.update as { callback_query?: { data?: string } }).callback_query;
      const data = cb?.data || '';
      if (data.startsWith('cat:')) {
        const raw = decodeURIComponent(data.slice(4));
        category = raw === '__skip__' ? null : raw;
        await ctx.answerCbQuery(category ? `Category: ${category}` : 'Skipped');
        try {
          await ctx.editMessageReplyMarkup(undefined);
        } catch {
          // ignore
        }
      }
    } else if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text.trim();
      if (text === '/cancel') {
        await ctx.reply('\u274C Cancelled.', md);
        return ctx.scene.leave();
      }
      if (text.startsWith('/')) {
        await ctx.reply('\u26A0\uFE0F Please pick a category or tap Skip.', md);
        return;
      }
      if (text.length > 50) {
        await ctx.reply('\u26A0\uFE0F Category name too long (max 50 chars).', md);
        return;
      }
      category = text.toLowerCase();
    } else {
      return;
    }

    try {
      await finalizeExpense(ctx, user.id, description, amount, mode, category);
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
