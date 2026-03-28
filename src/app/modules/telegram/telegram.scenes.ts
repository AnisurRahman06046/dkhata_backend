import { Scenes } from 'telegraf';
import { BotContext } from './telegram.middleware';
import { parsePrice } from './telegram.parser';
import { saleService } from '../sale/sale.service';
import logger from '../../utils/logger';

interface WizardSessionData extends Scenes.WizardSessionData {
  productName?: string;
}

type WizardContext = BotContext &
  Scenes.WizardContext<WizardSessionData>;

export const addSaleWizard = new Scenes.WizardScene<WizardContext>(
  'add-sale-wizard',

  // Step 1: Ask for product name
  async ctx => {
    await ctx.reply('What product did you sell? (e.g., Shirt, Rice, Jeans)');
    return ctx.wizard.next();
  },

  // Step 2: Receive product name, ask for price
  async ctx => {
    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text || text.startsWith('/')) {
      await ctx.reply('Please enter a valid product name.');
      return;
    }

    const productName = text.trim();
    if (productName.length > 200) {
      await ctx.reply('Product name is too long. Please use a shorter name.');
      return;
    }

    ctx.scene.session.productName = productName;
    await ctx.reply(`Got it! What was the price for "${productName}" (in BDT)?`);
    return ctx.wizard.next();
  },

  // Step 3: Receive price, create sale
  async ctx => {
    const text =
      ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
      await ctx.reply('Please enter a valid price (numbers only).');
      return;
    }

    const price = parsePrice(text);

    if (price === null) {
      await ctx.reply(
        'Invalid price. Please enter a positive number (e.g., 500).',
      );
      return;
    }

    const productName = ctx.scene.session.productName;
    if (!productName) {
      await ctx.reply('Something went wrong. Please try /addsale again.');
      return ctx.scene.leave();
    }

    const user = ctx.state.user;
    if (!user) {
      await ctx.reply('Please register with /start first.');
      return ctx.scene.leave();
    }

    try {
      await saleService.createSaleByUserId(user.id, productName, price);

      await ctx.reply(
        `Sale Recorded!\n` +
          `Product: ${productName}\n` +
          `Price: ${price} BDT\n\n` +
          `Use /today to see your daily summary.`,
      );
    } catch (error) {
      logger.error('Failed to create sale in wizard:', error);
      await ctx.reply('Failed to record sale. Please try again.');
    }

    return ctx.scene.leave();
  },
);
