import { ISummaryResult } from '../summary/summary.interface';

const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

const formatBDTime = (date: Date): string => {
  const bd = new Date(date.getTime() + BD_OFFSET_MS);
  const h = bd.getUTCHours();
  const m = String(bd.getUTCMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${period}`;
};

const formatBDDate = (date: Date): string => {
  const bd = new Date(date.getTime() + BD_OFFSET_MS);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${bd.getUTCDate()} ${months[bd.getUTCMonth()]} ${bd.getUTCFullYear()}`;
};

const formatCurrency = (amount: number | string | { toString(): string }): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  return num.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const divider = '\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n';

interface SaleItem {
  productName: string;
  price: { toString(): string };
  createdAt: Date;
}

interface ExpenseItem {
  description: string;
  amount: { toString(): string };
  createdAt: Date;
}

interface TransactionItem {
  type: 'sale' | 'expense';
  name: string;
  amount: number;
  createdAt: Date;
  id: string;
}

// ─── WELCOME ─────────────────────────

export const welcomeMessage = (name: string): string =>
  `\uD83D\uDCD2 *Digital Khata Bot*${divider}` +
  `Assalamu Alaikum, *${name}*!\n` +
  `Your digital sales diary is ready.\n` +
  `${divider}` +
  `\uD83D\uDE80 *Quick Start:*\n\n` +
  `\uD83D\uDFE2 Add sale: \`Shirt 500\`\n` +
  `\uD83D\uDD34 Add expense: \`-50\` or /expense\n` +
  `${divider}` +
  `\uD83D\uDCCB *Commands:*\n\n` +
  `\uD83D\uDCE5 /addsale \u2014 Add sale (guided)\n` +
  `\uD83D\uDCE4 /expense \u2014 Add expense (guided)\n` +
  `\uD83D\uDCB0 /balance \u2014 Live balance\n` +
  `\uD83D\uDCCA /today \u2014 Today\u2019s report\n` +
  `\uD83D\uDCC5 /week \u2014 Weekly report\n` +
  `\uD83D\uDCC6 /month \u2014 Monthly report\n` +
  `\uD83D\uDCDC /history \u2014 Recent entries\n` +
  `\uD83C\uDFD9\uFE0F /endday \u2014 Close today\n` +
  `\u274C /delete \u2014 Remove last entry\n` +
  `\u2753 /help \u2014 All commands\n` +
  `${divider}` +
  `\uD83D\uDCA1 _Tip: Use /setbalance to set your opening cash_`;

// ─── HELP ─────────────────────────

export const helpMessage = (): string =>
  `\u2753 *Help \u2014 Digital Khata Bot*${divider}` +
  `\uD83D\uDFE2 *Recording Sales:*\n\n` +
  `  \`Shirt 500\` \u2014 quick entry\n` +
  `  \`Rice 5kg 350\` \u2014 with description\n` +
  `  \`500 Shirt\` \u2014 price first\n` +
  `  \`Lungi \u09EB\u09E6\u09E6\` \u2014 Bangla numerals\n` +
  `  /addsale \u2014 step by step\n` +
  `${divider}` +
  `\uD83D\uDD34 *Recording Expenses:*\n\n` +
  `  \`-50\` \u2014 quick expense\n` +
  `  \`-100 Tea\` \u2014 with description\n` +
  `  /expense \u2014 step by step\n` +
  `${divider}` +
  `\uD83D\uDCCA *Reports & Balance:*\n\n` +
  `  /balance \u2014 Live balance now\n` +
  `  /today \u2014 Full day report\n` +
  `  /week \u2014 Last 7 days \u2B50\n` +
  `  /month \u2014 This month \u2B50\n` +
  `  /history \u2014 Recent entries\n` +
  `${divider}` +
  `\u2699\uFE0F *Management:*\n\n` +
  `  /endday \u2014 Close & lock today\n` +
  `  /delete \u2014 Remove last entry\n` +
  `  /setbalance \u2014 Set opening cash\n` +
  `  /start \u2014 Restart bot\n` +
  `${divider}` +
  `\u2B50 *Pro & Subscription:*\n\n` +
  `  /subscribe \u2014 Upgrade to Pro\n` +
  `  /pay \u2014 Submit payment\n` +
  `  /mystatus \u2014 View your plan\n` +
  `  /referral \u2014 Referral program\n` +
  `  /refer \u2014 Apply referral code`;

// ─── SALE CONFIRMATION ─────────────────────────

export const saleConfirmation = (
  productName: string,
  price: number,
  currentBalance: number,
): string =>
  `\uD83D\uDFE2 *Sale Recorded*${divider}` +
  `\uD83D\uDCE6 Product:     *${productName}*\n` +
  `\uD83D\uDCB0 Amount:     *+${formatCurrency(price)} BDT*\n` +
  `\uD83D\uDD52 Time:          ${formatBDTime(new Date())}${divider}` +
  `\uD83D\uDCB3 Balance:     *${formatCurrency(currentBalance)} BDT*`;

// ─── EXPENSE CONFIRMATION ─────────────────────────

export const expenseConfirmation = (
  description: string,
  amount: number,
  currentBalance: number,
): string =>
  `\uD83D\uDD34 *Expense Recorded*${divider}` +
  `\uD83D\uDCDD Expense:    *${description}*\n` +
  `\uD83D\uDCB8 Amount:     *-${formatCurrency(amount)} BDT*\n` +
  `\uD83D\uDD52 Time:          ${formatBDTime(new Date())}${divider}` +
  `\uD83D\uDCB3 Balance:     *${formatCurrency(currentBalance)} BDT*`;

// ─── WIZARD PROMPTS (SALE) ─────────────────────────

export const wizardAskProduct = (): string =>
  `\uD83D\uDCE5 *Add New Sale*${divider}` +
  `What product did you sell?\n\n` +
  `_Type the product name (e.g., Shirt, Rice, Jeans)_\n\n` +
  `\u274C /cancel to exit`;

export const wizardAskPrice = (productName: string): string =>
  `\uD83D\uDCE5 *Add New Sale*${divider}` +
  `\uD83D\uDCE6 Product: *${productName}*\n\n` +
  `What was the price? _(in BDT)_\n\n` +
  `_Type a number (e.g., 500)_\n\n` +
  `\u274C /cancel to exit`;

export const saleConfirmationWizard = (
  productName: string,
  price: number,
  currentBalance: number,
): string =>
  `\uD83D\uDFE2 *Sale Recorded*${divider}` +
  `\uD83D\uDCE6 Product:     *${productName}*\n` +
  `\uD83D\uDCB0 Amount:     *+${formatCurrency(price)} BDT*\n` +
  `\uD83D\uDD52 Time:          ${formatBDTime(new Date())}${divider}` +
  `\uD83D\uDCB3 Balance:     *${formatCurrency(currentBalance)} BDT*\n\n` +
  `\uD83D\uDCE5 /addsale to add another`;

// ─── WIZARD PROMPTS (EXPENSE) ─────────────────────────

export const wizardAskExpenseDesc = (): string =>
  `\uD83D\uDCE4 *Add New Expense*${divider}` +
  `What was the expense for?\n\n` +
  `_Type a description (e.g., Tea, Rent, Transport)_\n\n` +
  `\u274C /cancel to exit`;

export const wizardAskExpenseAmount = (description: string): string =>
  `\uD83D\uDCE4 *Add New Expense*${divider}` +
  `\uD83D\uDCDD Expense: *${description}*\n\n` +
  `How much? _(in BDT)_\n\n` +
  `_Type a number (e.g., 50)_\n\n` +
  `\u274C /cancel to exit`;

export const expenseConfirmationWizard = (
  description: string,
  amount: number,
  currentBalance: number,
): string =>
  `\uD83D\uDD34 *Expense Recorded*${divider}` +
  `\uD83D\uDCDD Expense:    *${description}*\n` +
  `\uD83D\uDCB8 Amount:     *-${formatCurrency(amount)} BDT*\n` +
  `\uD83D\uDD52 Time:          ${formatBDTime(new Date())}${divider}` +
  `\uD83D\uDCB3 Balance:     *${formatCurrency(currentBalance)} BDT*\n\n` +
  `\uD83D\uDCE4 /expense to add another`;

// ─── LIVE BALANCE ─────────────────────────

export interface BalanceData {
  date: string;
  openingBalance: number;
  totalSales: number;
  totalExpenses: number;
  currentBalance: number;
  isClosed: boolean;
}

export const balanceMessage = (data: BalanceData): string => {
  const status = data.isClosed ? '\uD83D\uDD12 Closed' : '\uD83D\uDFE2 Active';
  const netFlow = data.totalSales - data.totalExpenses;
  const netSign = netFlow >= 0 ? '+' : '';

  return (
    `\uD83D\uDCB0 *Live Balance*\n` +
    `\uD83D\uDCC5 ${formatBDDate(new Date())}  \u2502  ${status}${divider}` +
    `\uD83C\uDFE6 Opening:       *${formatCurrency(data.openingBalance)} BDT*\n` +
    `\uD83D\uDFE2 Sales:           *+${formatCurrency(data.totalSales)} BDT*\n` +
    `\uD83D\uDD34 Expenses:      *-${formatCurrency(data.totalExpenses)} BDT*\n` +
    `\uD83D\uDCCA Net:                ${netSign}${formatCurrency(netFlow)} BDT${divider}` +
    `\uD83D\uDCB3 *Current Balance:  ${formatCurrency(data.currentBalance)} BDT*`
  );
};

// ─── END DAY ─────────────────────────

export interface EndDayData {
  date: string;
  openingBalance: number;
  totalSales: number;
  totalExpenses: number;
  closingBalance: number;
}

export const endDayMessage = (data: EndDayData): string => {
  const netFlow = data.totalSales - data.totalExpenses;
  const netSign = netFlow >= 0 ? '+' : '';
  const emoji = netFlow >= 0 ? '\uD83D\uDCC8' : '\uD83D\uDCC9';

  return (
    `\uD83C\uDFD9\uFE0F *Day Closed*\n` +
    `\uD83D\uDCC5 ${formatBDDate(new Date())}${divider}` +
    `\uD83C\uDFE6 Opening:       *${formatCurrency(data.openingBalance)} BDT*\n` +
    `\uD83D\uDFE2 Total Sales:   *+${formatCurrency(data.totalSales)} BDT*\n` +
    `\uD83D\uDD34 Total Exp:     *-${formatCurrency(data.totalExpenses)} BDT*\n` +
    `${emoji} Net P/L:          ${netSign}${formatCurrency(netFlow)} BDT${divider}` +
    `\uD83D\uDD10 *Closing Balance:  ${formatCurrency(data.closingBalance)} BDT*\n\n` +
    `_Tomorrow\u2019s opening will be ${formatCurrency(data.closingBalance)} BDT_`
  );
};

export const endDayReminder = (): string =>
  `\uD83D\uDD14 *End of Day Reminder*${divider}` +
  `Your day hasn\u2019t been closed yet.\n` +
  `Use /endday to close and lock today\u2019s records.\n\n` +
  `_The day will auto-close at midnight if not closed manually._`;

// ─── TODAY SUMMARY (NEW FORMAT) ─────────────────────────

export const todaySummaryEmpty = (openingBalance: number): string =>
  `\uD83D\uDCCA *Today\u2019s Report*\n` +
  `\uD83D\uDCC5 ${formatBDDate(new Date())}${divider}` +
  `\uD83C\uDFE6 Opening: *${formatCurrency(openingBalance)} BDT*\n\n` +
  `\uD83D\uDEAB No transactions recorded yet.${divider}` +
  `\uD83D\uDCA1 _Type_ \`Product Price\` _to add a sale_\n` +
  `_Type_ \`-Amount\` _to add an expense_`;

export const todaySummary = (
  summary: ISummaryResult,
  sales: SaleItem[],
  expenses: ExpenseItem[],
): string => {
  const netFlow = summary.totalSales - summary.totalExpenses;
  const netSign = netFlow >= 0 ? '+' : '';
  const emoji = netFlow >= 0 ? '\uD83D\uDCC8' : '\uD83D\uDCC9';

  let msg =
    `\uD83D\uDCCA *Today\u2019s Report*\n` +
    `\uD83D\uDCC5 ${formatBDDate(new Date())}${divider}` +
    `\uD83C\uDFE6 Opening:       *${formatCurrency(summary.openingBalance)} BDT*\n` +
    `\uD83D\uDFE2 Sales (${summary.transactionCount}):    *+${formatCurrency(summary.totalSales)} BDT*\n` +
    `\uD83D\uDD34 Expenses (${summary.expenseCount}): *-${formatCurrency(summary.totalExpenses)} BDT*\n` +
    `${emoji} Net:                ${netSign}${formatCurrency(netFlow)} BDT${divider}` +
    `\uD83D\uDCB3 *Balance:  ${formatCurrency(summary.closingBalance)} BDT*${divider}`;

  if (sales.length > 0) {
    msg += `\uD83D\uDFE2 *Sales:*\n`;
    sales.forEach((sale, i) => {
      msg += `  ${String(i + 1).padStart(2, ' ')}. ${sale.productName}  \u2014  +${formatCurrency(sale.price)} BDT  (${formatBDTime(sale.createdAt)})\n`;
    });
  }

  if (expenses.length > 0) {
    msg += `\n\uD83D\uDD34 *Expenses:*\n`;
    expenses.forEach((exp, i) => {
      msg += `  ${String(i + 1).padStart(2, ' ')}. ${exp.description}  \u2014  -${formatCurrency(exp.amount)} BDT  (${formatBDTime(exp.createdAt)})\n`;
    });
  }

  return msg;
};

// ─── WEEKLY / MONTHLY SUMMARY ─────────────────────────

export const periodSummary = (
  summary: ISummaryResult,
  title: string,
  emoji: string,
): string => {
  const netFlow = summary.totalSales - summary.totalExpenses;
  const netSign = netFlow >= 0 ? '+' : '';
  const trendEmoji = netFlow >= 0 ? '\uD83D\uDCC8' : '\uD83D\uDCC9';
  const days = getDaysBetween(summary.startDate, summary.endDate);

  return (
    `${emoji} *${title}*\n` +
    `\uD83D\uDCC5 ${formatBDDate(summary.startDate)} \u2014 ${formatBDDate(summary.endDate)}${divider}` +
    `\uD83C\uDFE6 Opening:        *${formatCurrency(summary.openingBalance)} BDT*\n` +
    `\uD83D\uDFE2 Sales (${summary.transactionCount}):     *+${formatCurrency(summary.totalSales)} BDT*\n` +
    `\uD83D\uDD34 Expenses (${summary.expenseCount}):  *-${formatCurrency(summary.totalExpenses)} BDT*\n` +
    `${trendEmoji} Net P/L:           ${netSign}${formatCurrency(netFlow)} BDT${divider}` +
    `\uD83D\uDCB3 *Balance:  ${formatCurrency(summary.closingBalance)} BDT*${divider}` +
    `\uD83D\uDCC5 Avg / Day:   ${formatCurrency(summary.totalSales / days)} BDT sales\n` +
    `\uD83D\uDCCB Avg / Sale:   ${formatCurrency(summary.transactionCount > 0 ? summary.totalSales / summary.transactionCount : 0)} BDT`
  );
};

const getDaysBetween = (start: Date, end: Date): number => {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// ─── HISTORY ─────────────────────────

export const historyEmpty = (): string =>
  `\uD83D\uDCDC *Transaction History*${divider}` +
  `\uD83D\uDEAB No entries recorded yet.${divider}` +
  `\uD83D\uDCA1 _Type_ \`Product Price\` _to add a sale_\n` +
  `_Type_ \`-Amount\` _to add an expense_`;

export const historyList = (
  transactions: TransactionItem[],
  total: number,
): string => {
  let msg =
    `\uD83D\uDCDC *Transaction History*\n` +
    `Showing ${transactions.length} of ${total} entries${divider}`;

  let currentDate = '';

  transactions.forEach((tx, i) => {
    const dateStr = formatBDDate(tx.createdAt);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      msg += `\n\uD83D\uDCC5 *${dateStr}*\n`;
    }
    const time = formatBDTime(tx.createdAt);
    const icon = tx.type === 'sale' ? '\uD83D\uDFE2' : '\uD83D\uDD34';
    const sign = tx.type === 'sale' ? '+' : '-';
    msg += `  ${icon} ${String(i + 1).padStart(2, ' ')}. ${tx.name}  \u2014  *${sign}${formatCurrency(tx.amount)} BDT*\n`;
    msg += `        ${time}\n`;
  });

  msg += `${divider}`;
  msg += `\u274C _Reply with /delete to remove last entry_`;

  return msg;
};

// ─── DELETE ─────────────────────────

export const deleteConfirmation = (
  type: 'sale' | 'expense',
  name: string,
  amount: number,
  currentBalance: number,
): string => {
  const icon = type === 'sale' ? '\uD83D\uDFE2' : '\uD83D\uDD34';

  return (
    `\u274C *Entry Deleted*${divider}` +
    `${icon} ${type === 'sale' ? 'Sale' : 'Expense'}: *${name}*\n` +
    `\uD83D\uDCB0 Amount: *${formatCurrency(amount)} BDT*${divider}` +
    `\uD83D\uDCB3 Updated Balance: *${formatCurrency(currentBalance)} BDT*`
  );
};

export const deleteNothing = (): string =>
  `\u274C *Nothing to Delete*\n\n` +
  `No entries found for today.`;

// ─── SET BALANCE ─────────────────────────

export const setBalanceSuccess = (amount: number): string =>
  `\uD83C\uDFE6 *Opening Balance Set*${divider}` +
  `\uD83D\uDCB0 Amount: *${formatCurrency(amount)} BDT*\n\n` +
  `_This will be your starting balance._`;

export const setBalancePrompt = (): string =>
  `\uD83C\uDFE6 *Set Opening Balance*${divider}` +
  `How much cash do you have right now? _(in BDT)_\n\n` +
  `_Type a number (e.g., 5000)_\n\n` +
  `\u274C /cancel to exit`;

// ─── ERROR MESSAGES ─────────────────────────

export const errorGeneric = (): string =>
  `\u26A0\uFE0F *Something went wrong*\n\n` +
  `Please try again. If the problem persists,\nuse /start to restart the bot.`;

export const errorNotRegistered = (): string =>
  `\uD83D\uDD12 *Not Registered*\n\n` +
  `Please use /start to register before using the bot.`;

export const errorInvalidInput = (): string =>
  `\u26A0\uFE0F *Couldn\u2019t understand your input*\n\n` +
  `\uD83D\uDFE2 *To add a sale:*\n` +
  `  \`Shirt 500\` or \`500 Shirt\`\n\n` +
  `\uD83D\uDD34 *To add an expense:*\n` +
  `  \`-50\` or \`-100 Tea\`\n\n` +
  `Or use /addsale or /expense for guided entry.`;

export const errorInvalidPrice = (): string =>
  `\u26A0\uFE0F *Invalid price*\n\n` +
  `Please enter a positive number.\n` +
  `_Example:_ \`500\` _or_ \`\u09EB\u09E6\u09E6\``;

export const errorInvalidProductName = (): string =>
  `\u26A0\uFE0F *Invalid product name*\n\n` +
  `Please enter a valid product name.\n` +
  `_Example: Shirt, Rice, Blue Jeans_`;

export const errorDayClosed = (): string =>
  `\uD83D\uDD12 *Day Already Closed*\n\n` +
  `Today\u2019s ledger is locked.\n` +
  `New entries will be recorded for tomorrow.`;

// ─── SUBSCRIPTION TEMPLATES ─────────────────────────

export const subscribeMessage = (): string =>
  `\u2B50 *Upgrade to Pro Business*${divider}` +
  `\uD83D\uDCCA *Pro Features:*\n\n` +
  `  \u2705 Weekly reports (/week)\n` +
  `  \u2705 Monthly reports (/month)\n` +
  `  \u2705 Google Sheets auto-sync\n` +
  `  \u2705 Referral rewards\n` +
  `${divider}` +
  `\uD83D\uDCB0 *Pricing:*\n\n` +
  `  \uD83D\uDCCD Monthly:  *199 BDT/month*\n` +
  `  \uD83D\uDCCD Yearly:     *1,499 BDT/year* (Save 30%)\n` +
  `${divider}` +
  `\uD83D\uDCB3 *How to Pay:*\n\n` +
  `  1. Send *199 BDT* (or 1,499) to:\n` +
  `     bKash: *01XXXXXXXXX*\n` +
  `     Nagad: *01XXXXXXXXX*\n\n` +
  `  2. Copy your Transaction ID\n\n` +
  `  3. Send:\n` +
  `     \`/pay bkash TXN123 monthly\`\n` +
  `     \`/pay nagad TXN456 yearly\`\n\n` +
  `  4. Wait for admin verification \u2705\n` +
  `${divider}` +
  `\uD83C\uDF81 _Invite 3 friends and get 1 month free! Use /referral_`;

export const paymentSubmitted = (method: string, txnId: string, plan: string): string =>
  `\u2705 *Payment Submitted*${divider}` +
  `\uD83D\uDCB3 Method:    *${method}*\n` +
  `\uD83D\uDD22 TXN ID:     *${txnId}*\n` +
  `\uD83D\uDCCB Plan:        *${plan}*${divider}` +
  `\u23F3 _Awaiting admin verification. You\u2019ll be notified once confirmed._`;

export const paymentVerifiedUser = (plan: string, expiresAt: Date): string =>
  `\uD83C\uDF89 *Payment Verified!*${divider}` +
  `\u2B50 Plan: *${plan}*\n` +
  `\uD83D\uDCC5 Expires: *${formatBDDate(expiresAt)}*${divider}` +
  `You now have access to all Pro features!\n` +
  `Try /week or /month to see your reports.`;

export const paymentRejected = (reason: string): string =>
  `\u274C *Payment Rejected*${divider}` +
  `Reason: ${reason}\n\n` +
  `Please try again with a valid transaction.\nUse /subscribe for payment details.`;

export const planStatusMessage = (data: {
  plan: string;
  isPro: boolean;
  daysLeft: number;
  streakDays: number;
  referralCode: string;
}): string => {
  const planName = data.isPro ? '\u2B50 Pro Business' : '\uD83D\uDCCB Basic Khata (Free)';
  let msg =
    `\uD83D\uDCCB *Your Plan*${divider}` +
    `\uD83D\uDCE6 Plan: *${planName}*\n` +
    `\uD83D\uDD25 Streak: *${data.streakDays} days*\n`;

  if (data.isPro) {
    msg += `\uD83D\uDCC5 Expires in: *${data.daysLeft} days*\n`;
  }

  msg += `${divider}`;

  if (!data.isPro) {
    msg += `\u2B50 _Upgrade with /subscribe_\n`;
  }

  msg += `\uD83C\uDF81 Referral code: \`${data.referralCode}\``;
  return msg;
};

export const referralMessage = (data: {
  referralCode: string;
  totalReferrals: number;
  unrewardedCount: number;
  referralsNeeded: number;
}): string =>
  `\uD83C\uDF81 *Referral Program*${divider}` +
  `\uD83D\uDD17 Your code: \`${data.referralCode}\`\n\n` +
  `Share this code with friends!\n` +
  `When they join and use your code,\nyou earn rewards.${divider}` +
  `\uD83D\uDCCA *Stats:*\n\n` +
  `  \uD83D\uDC65 Total referrals: *${data.totalReferrals}*\n` +
  `  \u2B50 Progress: *${data.unrewardedCount}/${3}*\n` +
  `  \uD83C\uDFAF Need ${data.referralsNeeded} more for free month!${divider}` +
  `_Ask friends to send:_ \`/refer ${data.referralCode}\``;

export const referralApplied = (referrerName: string): string =>
  `\u2705 *Referral Applied!*\n\n` +
  `You were referred by *${referrerName}*.\n` +
  `_They\u2019re one step closer to a free Pro month!_`;

export const proFeatureLocked = (feature: string): string =>
  `\uD83D\uDD12 *Pro Feature*${divider}` +
  `*${feature}* is available for Pro users.\n\n` +
  `\u2B50 Upgrade for just *199 BDT/month*\n` +
  `Use /subscribe for details.`;

export const upgradeNudge = (message: string): string =>
  `\n${divider}\u2B50 _${message}_\n_Use /subscribe to upgrade._`;

// ─── ADMIN TEMPLATES ─────────────────────────

export const adminPaymentsList = (
  payments: Array<{
    id: string;
    user: { name: string; telegramId: string };
    method: string;
    transactionId: string;
    planType: string;
    amount: { toString(): string };
    createdAt: Date;
  }>,
  total: number,
): string => {
  if (payments.length === 0) {
    return `\uD83D\uDCCB *Pending Payments*${divider}No pending payments.`;
  }

  let msg = `\uD83D\uDCCB *Pending Payments* (${total})${divider}`;

  payments.forEach((p, i) => {
    msg += `${i + 1}. *${p.user.name}* (${p.user.telegramId})\n`;
    msg += `   ${p.method} \u2022 TXN: \`${p.transactionId}\`\n`;
    msg += `   ${p.planType} \u2022 ${formatCurrency(p.amount)} BDT\n`;
    msg += `   ID: \`${p.id.slice(0, 8)}\`\n`;
    msg += `   ${formatBDDate(p.createdAt)} ${formatBDTime(p.createdAt)}\n\n`;
  });

  msg += `${divider}`;
  msg += `\u2705 \`/admin_verify <id>\`\n`;
  msg += `\u274C \`/admin_reject <id> [reason]\``;

  return msg;
};

export const adminVerified = (userName: string, plan: string): string =>
  `\u2705 *Payment Verified*\n\n` +
  `User: *${userName}*\n` +
  `Plan: *${plan}*\n\n` +
  `_User has been notified._`;

export const adminRejected = (userName: string, reason: string): string =>
  `\u274C *Payment Rejected*\n\n` +
  `User: *${userName}*\n` +
  `Reason: ${reason}\n\n` +
  `_User has been notified._`;

export const adminUnauthorized = (): string =>
  `\u26D4 *Unauthorized*\n\nYou are not an admin.`;
