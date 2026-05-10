import { ISummaryResult } from '../summary/summary.interface';
import { UserMode } from '../../../../generated/prisma/client';

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
  category?: string | null;
}

interface ExpenseItem {
  description: string;
  amount: { toString(): string };
  createdAt: Date;
  category?: string | null;
}

interface TransactionItem {
  type: 'sale' | 'expense';
  name: string;
  amount: number;
  createdAt: Date;
  id: string;
}

// ─── MODE-AWARE LABELS ─────────────────────────

const isPersonal = (mode?: UserMode): boolean => mode === 'PERSONAL';

const labels = (mode?: UserMode) => ({
  inLabel: isPersonal(mode) ? 'Income' : 'Sales',
  inLabelSingular: isPersonal(mode) ? 'Income' : 'Sale',
  outLabel: isPersonal(mode) ? 'Expenses' : 'Expenses',
  addInCmd: isPersonal(mode) ? '/addincome' : '/addsale',
  inItemLabel: isPersonal(mode) ? 'Source' : 'Product',
  inNameField: isPersonal(mode) ? 'Source' : 'Product',
});

// ─── PRESET CATEGORIES (PERSONAL MODE) ─────────────────────────

export const PERSONAL_INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Gift',
  'Investment',
  'Other',
];

export const PERSONAL_EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Rent',
  'Health',
  'Shopping',
  'Entertainment',
  'Education',
  'Other',
];

// ─── MODE PICKER ─────────────────────────

export const modePickerMessage = (name: string): string =>
  `\uD83D\uDC4B *Welcome, ${name}!*${divider}` +
  `How will you use this bot?\n\n` +
  `\uD83C\uDFEA *Shop Owner* \u2014 track sales & expenses for your shop\n\n` +
  `\uD83D\uDC64 *Personal Finance* \u2014 track your income & spending\n\n` +
  `_Tap a button below to choose._\n` +
  `_This choice is one-time and cannot be changed later._`;

export const modeSelected = (mode: UserMode): string => {
  if (mode === 'PERSONAL') {
    return (
      `\u2705 *Personal Finance mode activated*${divider}` +
      `\uD83D\uDE80 *Quick Start:*\n\n` +
      `\uD83D\uDFE2 Income: \`Salary 50000\` or \`50000 Salary\`\n` +
      `\uD83D\uDD34 Expense: \`-200 Lunch\`\n` +
      `\uD83C\uDFF7\uFE0F Add category: \`-200 Lunch #food\`\n\n` +
      `Or use /addincome and /expense for guided entry.\n\n` +
      `Use /help to see all commands.`
    );
  }
  return (
    `\u2705 *Shop Owner mode activated*${divider}` +
    `\uD83D\uDE80 *Quick Start:*\n\n` +
    `\uD83D\uDFE2 Add sale: \`Shirt 500\`\n` +
    `\uD83D\uDD34 Add expense: \`-50\` or /expense\n\n` +
    `Or use /addsale and /expense for guided entry.\n\n` +
    `Use /help to see all commands.`
  );
};

// ─── WELCOME ─────────────────────────

export const welcomeMessage = (name: string, mode?: UserMode): string => {
  if (isPersonal(mode)) {
    return (
      `\uD83D\uDCD2 *Digital Khata Bot*${divider}` +
      `Assalamu Alaikum, *${name}*!\n` +
      `Your personal finance tracker is ready.\n` +
      `${divider}` +
      `\uD83D\uDE80 *Quick Start:*\n\n` +
      `\uD83D\uDFE2 Add income: \`Salary 50000\`\n` +
      `\uD83D\uDD34 Add expense: \`-200 Lunch\` or /expense\n` +
      `\uD83C\uDFF7\uFE0F Tag category: \`-200 Lunch #food\`\n` +
      `${divider}` +
      `\uD83D\uDCCB *Commands:*\n\n` +
      `\uD83D\uDCE5 /addincome \u2014 Add income (guided)\n` +
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
      `\uD83D\uDCA1 _Tip: Use /setbalance to set your starting cash_`
    );
  }
  return (
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
    `\uD83D\uDCA1 _Tip: Use /setbalance to set your opening cash_`
  );
};

// ─── HELP ─────────────────────────

export const helpMessage = (mode?: UserMode): string => {
  if (isPersonal(mode)) {
    return (
      `\u2753 *Help \u2014 Digital Khata Bot*${divider}` +
      `\uD83D\uDFE2 *Recording Income:*\n\n` +
      `  \`Salary 50000\` \u2014 quick entry\n` +
      `  \`Freelance 3000\` \u2014 with source\n` +
      `  \`50000 Salary\` \u2014 amount first\n` +
      `  \`Bonus \u09EB\u09E6\u09E6\u09E6\` \u2014 Bangla numerals\n` +
      `  /addincome \u2014 step by step\n` +
      `${divider}` +
      `\uD83D\uDD34 *Recording Expenses:*\n\n` +
      `  \`-200\` \u2014 quick expense\n` +
      `  \`-500 Lunch\` \u2014 with description\n` +
      `  \`-500 Lunch #food\` \u2014 with category\n` +
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
      `  /setbalance \u2014 Set starting cash\n` +
      `  /start \u2014 Restart bot\n` +
      `${divider}` +
      `\u2B50 *Pro & Subscription:*\n\n` +
      `  /subscribe \u2014 Upgrade to Pro\n` +
      `  /pay \u2014 Submit payment\n` +
      `  /mystatus \u2014 View your plan\n` +
      `  /referral \u2014 Referral program\n` +
      `  /refer \u2014 Apply referral code`
    );
  }
  return (
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
    `  /refer \u2014 Apply referral code`
  );
};

// ─── SALE / INCOME CONFIRMATION ─────────────────────────

export const saleConfirmation = (
  productName: string,
  price: number,
  currentBalance: number,
  mode?: UserMode,
  category?: string | null,
): string => {
  const l = labels(mode);
  const catLine = category ? `\uD83C\uDFF7\uFE0F Category:    *${category}*\n` : '';
  return (
    `\uD83D\uDFE2 *${l.inLabelSingular} Recorded*${divider}` +
    `\uD83D\uDCE6 ${l.inNameField}:     *${productName}*\n` +
    `\uD83D\uDCB0 Amount:     *+${formatCurrency(price)} BDT*\n` +
    catLine +
    `\uD83D\uDD52 Time:          ${formatBDTime(new Date())}${divider}` +
    `\uD83D\uDCB3 Balance:     *${formatCurrency(currentBalance)} BDT*`
  );
};

export const expenseConfirmation = (
  description: string,
  amount: number,
  currentBalance: number,
  _mode?: UserMode,
  category?: string | null,
): string => {
  const catLine = category ? `\uD83C\uDFF7\uFE0F Category:    *${category}*\n` : '';
  return (
    `\uD83D\uDD34 *Expense Recorded*${divider}` +
    `\uD83D\uDCDD Expense:    *${description}*\n` +
    `\uD83D\uDCB8 Amount:     *-${formatCurrency(amount)} BDT*\n` +
    catLine +
    `\uD83D\uDD52 Time:          ${formatBDTime(new Date())}${divider}` +
    `\uD83D\uDCB3 Balance:     *${formatCurrency(currentBalance)} BDT*`
  );
};

// ─── WIZARD PROMPTS (SALE / INCOME) ─────────────────────────

export const wizardAskProduct = (mode?: UserMode): string => {
  if (isPersonal(mode)) {
    return (
      `\uD83D\uDCE5 *Add New Income*${divider}` +
      `Where did the income come from?\n\n` +
      `_Type a source (e.g., Salary, Freelance, Bonus)_\n\n` +
      `\u274C /cancel to exit`
    );
  }
  return (
    `\uD83D\uDCE5 *Add New Sale*${divider}` +
    `What product did you sell?\n\n` +
    `_Type the product name (e.g., Shirt, Rice, Jeans)_\n\n` +
    `\u274C /cancel to exit`
  );
};

export const wizardAskPrice = (productName: string, mode?: UserMode): string => {
  const l = labels(mode);
  const title = isPersonal(mode) ? 'Add New Income' : 'Add New Sale';
  return (
    `\uD83D\uDCE5 *${title}*${divider}` +
    `\uD83D\uDCE6 ${l.inNameField}: *${productName}*\n\n` +
    `${isPersonal(mode) ? 'How much?' : 'What was the price?'} _(in BDT)_\n\n` +
    `_Type a number (e.g., ${isPersonal(mode) ? '50000' : '500'})_\n\n` +
    `\u274C /cancel to exit`
  );
};

export const wizardAskCategory = (kind: 'income' | 'expense'): string =>
  `\uD83C\uDFF7\uFE0F *Pick a Category*${divider}` +
  `Choose a category for this ${kind}, or tap *Skip*.\n\n` +
  `_Tap a button below, or type a new category name._\n\n` +
  `\u274C /cancel to exit`;

export const saleConfirmationWizard = (
  productName: string,
  price: number,
  currentBalance: number,
  mode?: UserMode,
  category?: string | null,
): string => {
  const l = labels(mode);
  const title = isPersonal(mode) ? 'Income Recorded' : 'Sale Recorded';
  const catLine = category ? `\uD83C\uDFF7\uFE0F Category:    *${category}*\n` : '';
  return (
    `\uD83D\uDFE2 *${title}*${divider}` +
    `\uD83D\uDCE6 ${l.inNameField}:     *${productName}*\n` +
    `\uD83D\uDCB0 Amount:     *+${formatCurrency(price)} BDT*\n` +
    catLine +
    `\uD83D\uDD52 Time:          ${formatBDTime(new Date())}${divider}` +
    `\uD83D\uDCB3 Balance:     *${formatCurrency(currentBalance)} BDT*\n\n` +
    `\uD83D\uDCE5 ${l.addInCmd} to add another`
  );
};

// ─── WIZARD PROMPTS (EXPENSE) ─────────────────────────

export const wizardAskExpenseDesc = (mode?: UserMode): string =>
  `\uD83D\uDCE4 *Add New Expense*${divider}` +
  `What was the expense for?\n\n` +
  `_Type a description (e.g., ${isPersonal(mode) ? 'Lunch, Bus, Electricity' : 'Tea, Rent, Transport'})_\n\n` +
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
  _mode?: UserMode,
  category?: string | null,
): string => {
  const catLine = category ? `\uD83C\uDFF7\uFE0F Category:    *${category}*\n` : '';
  return (
    `\uD83D\uDD34 *Expense Recorded*${divider}` +
    `\uD83D\uDCDD Expense:    *${description}*\n` +
    `\uD83D\uDCB8 Amount:     *-${formatCurrency(amount)} BDT*\n` +
    catLine +
    `\uD83D\uDD52 Time:          ${formatBDTime(new Date())}${divider}` +
    `\uD83D\uDCB3 Balance:     *${formatCurrency(currentBalance)} BDT*\n\n` +
    `\uD83D\uDCE4 /expense to add another`
  );
};

// ─── LIVE BALANCE ─────────────────────────

export interface BalanceData {
  date: string;
  openingBalance: number;
  totalSales: number;
  totalExpenses: number;
  currentBalance: number;
  isClosed: boolean;
}

export const balanceMessage = (data: BalanceData, mode?: UserMode): string => {
  const l = labels(mode);
  const status = data.isClosed ? '\uD83D\uDD12 Closed' : '\uD83D\uDFE2 Active';
  const netFlow = data.totalSales - data.totalExpenses;
  const netSign = netFlow >= 0 ? '+' : '';

  return (
    `\uD83D\uDCB0 *Live Balance*\n` +
    `\uD83D\uDCC5 ${formatBDDate(new Date())}  \u2502  ${status}${divider}` +
    `\uD83C\uDFE6 Opening:       *${formatCurrency(data.openingBalance)} BDT*\n` +
    `\uD83D\uDFE2 ${l.inLabel}:           *+${formatCurrency(data.totalSales)} BDT*\n` +
    `\uD83D\uDD34 ${l.outLabel}:      *-${formatCurrency(data.totalExpenses)} BDT*\n` +
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

export const endDayMessage = (data: EndDayData, mode?: UserMode): string => {
  const l = labels(mode);
  const netFlow = data.totalSales - data.totalExpenses;
  const netSign = netFlow >= 0 ? '+' : '';
  const emoji = netFlow >= 0 ? '\uD83D\uDCC8' : '\uD83D\uDCC9';
  const netLine = isPersonal(mode) ? 'Net Savings' : 'Net P/L';

  return (
    `\uD83C\uDFD9\uFE0F *Day Closed*\n` +
    `\uD83D\uDCC5 ${formatBDDate(new Date())}${divider}` +
    `\uD83C\uDFE6 Opening:       *${formatCurrency(data.openingBalance)} BDT*\n` +
    `\uD83D\uDFE2 Total ${l.inLabel}:   *+${formatCurrency(data.totalSales)} BDT*\n` +
    `\uD83D\uDD34 Total Exp:     *-${formatCurrency(data.totalExpenses)} BDT*\n` +
    `${emoji} ${netLine}:         ${netSign}${formatCurrency(netFlow)} BDT${divider}` +
    `\uD83D\uDD10 *Closing Balance:  ${formatCurrency(data.closingBalance)} BDT*\n\n` +
    `_Tomorrow\u2019s opening will be ${formatCurrency(data.closingBalance)} BDT_`
  );
};

export const endDayReminder = (): string =>
  `\uD83D\uDD14 *End of Day Reminder*${divider}` +
  `Your day hasn\u2019t been closed yet.\n` +
  `Use /endday to close and lock today\u2019s records.\n\n` +
  `_The day will auto-close at midnight if not closed manually._`;

// ─── TODAY SUMMARY ─────────────────────────

export const todaySummaryEmpty = (openingBalance: number, mode?: UserMode): string => {
  const example = isPersonal(mode) ? '`Salary Amount`' : '`Product Price`';
  return (
    `\uD83D\uDCCA *Today\u2019s Report*\n` +
    `\uD83D\uDCC5 ${formatBDDate(new Date())}${divider}` +
    `\uD83C\uDFE6 Opening: *${formatCurrency(openingBalance)} BDT*\n\n` +
    `\uD83D\uDEAB No transactions recorded yet.${divider}` +
    `\uD83D\uDCA1 _Type_ ${example} _to add an entry_\n` +
    `_Type_ \`-Amount\` _to add an expense_`
  );
};

interface CategoryBreakdownItem {
  category: string;
  total: number;
  count: number;
}

export const todaySummary = (
  summary: ISummaryResult,
  sales: SaleItem[],
  expenses: ExpenseItem[],
  mode?: UserMode,
  breakdown?: {
    income?: CategoryBreakdownItem[];
    expense?: CategoryBreakdownItem[];
  },
): string => {
  const l = labels(mode);
  const netFlow = summary.totalSales - summary.totalExpenses;
  const netSign = netFlow >= 0 ? '+' : '';
  const emoji = netFlow >= 0 ? '\uD83D\uDCC8' : '\uD83D\uDCC9';

  let msg =
    `\uD83D\uDCCA *Today\u2019s Report*\n` +
    `\uD83D\uDCC5 ${formatBDDate(new Date())}${divider}` +
    `\uD83C\uDFE6 Opening:       *${formatCurrency(summary.openingBalance)} BDT*\n` +
    `\uD83D\uDFE2 ${l.inLabel} (${summary.transactionCount}):    *+${formatCurrency(summary.totalSales)} BDT*\n` +
    `\uD83D\uDD34 ${l.outLabel} (${summary.expenseCount}): *-${formatCurrency(summary.totalExpenses)} BDT*\n` +
    `${emoji} Net:                ${netSign}${formatCurrency(netFlow)} BDT${divider}` +
    `\uD83D\uDCB3 *Balance:  ${formatCurrency(summary.closingBalance)} BDT*${divider}`;

  if (sales.length > 0) {
    msg += `\uD83D\uDFE2 *${l.inLabel}:*\n`;
    sales.forEach((sale, i) => {
      const cat = sale.category ? ` [${sale.category}]` : '';
      msg += `  ${String(i + 1).padStart(2, ' ')}. ${sale.productName}${cat}  \u2014  +${formatCurrency(sale.price)} BDT  (${formatBDTime(sale.createdAt)})\n`;
    });
  }

  if (expenses.length > 0) {
    msg += `\n\uD83D\uDD34 *${l.outLabel}:*\n`;
    expenses.forEach((exp, i) => {
      const cat = exp.category ? ` [${exp.category}]` : '';
      msg += `  ${String(i + 1).padStart(2, ' ')}. ${exp.description}${cat}  \u2014  -${formatCurrency(exp.amount)} BDT  (${formatBDTime(exp.createdAt)})\n`;
    });
  }

  if (isPersonal(mode) && breakdown) {
    if (breakdown.expense && breakdown.expense.length > 0) {
      msg += `\n\uD83C\uDFF7\uFE0F *Expense by Category:*\n`;
      breakdown.expense.forEach(b => {
        msg += `  \u2022 ${b.category} (${b.count})  \u2014  *${formatCurrency(b.total)} BDT*\n`;
      });
    }
    if (breakdown.income && breakdown.income.length > 0) {
      msg += `\n\uD83C\uDFF7\uFE0F *Income by Source:*\n`;
      breakdown.income.forEach(b => {
        msg += `  \u2022 ${b.category} (${b.count})  \u2014  *${formatCurrency(b.total)} BDT*\n`;
      });
    }
  }

  return msg;
};

// ─── WEEKLY / MONTHLY SUMMARY ─────────────────────────

export const periodSummary = (
  summary: ISummaryResult,
  title: string,
  emoji: string,
  mode?: UserMode,
  breakdown?: {
    income?: CategoryBreakdownItem[];
    expense?: CategoryBreakdownItem[];
  },
): string => {
  const l = labels(mode);
  const netFlow = summary.totalSales - summary.totalExpenses;
  const netSign = netFlow >= 0 ? '+' : '';
  const trendEmoji = netFlow >= 0 ? '\uD83D\uDCC8' : '\uD83D\uDCC9';
  const days = getDaysBetween(summary.startDate, summary.endDate);
  const netLine = isPersonal(mode) ? 'Net Savings' : 'Net P/L';
  const avgLabel = isPersonal(mode) ? 'income' : 'sales';
  const avgPerLabel = isPersonal(mode) ? 'Avg / Entry' : 'Avg / Sale';

  let msg =
    `${emoji} *${title}*\n` +
    `\uD83D\uDCC5 ${formatBDDate(summary.startDate)} \u2014 ${formatBDDate(summary.endDate)}${divider}` +
    `\uD83C\uDFE6 Opening:        *${formatCurrency(summary.openingBalance)} BDT*\n` +
    `\uD83D\uDFE2 ${l.inLabel} (${summary.transactionCount}):     *+${formatCurrency(summary.totalSales)} BDT*\n` +
    `\uD83D\uDD34 ${l.outLabel} (${summary.expenseCount}):  *-${formatCurrency(summary.totalExpenses)} BDT*\n` +
    `${trendEmoji} ${netLine}:        ${netSign}${formatCurrency(netFlow)} BDT${divider}` +
    `\uD83D\uDCB3 *Balance:  ${formatCurrency(summary.closingBalance)} BDT*${divider}` +
    `\uD83D\uDCC5 Avg / Day:   ${formatCurrency(summary.totalSales / days)} BDT ${avgLabel}\n` +
    `\uD83D\uDCCB ${avgPerLabel}:   ${formatCurrency(summary.transactionCount > 0 ? summary.totalSales / summary.transactionCount : 0)} BDT`;

  if (isPersonal(mode) && breakdown) {
    if (breakdown.expense && breakdown.expense.length > 0) {
      msg += `${divider}\uD83C\uDFF7\uFE0F *Expense by Category:*\n`;
      breakdown.expense.forEach(b => {
        msg += `  \u2022 ${b.category} (${b.count})  \u2014  *${formatCurrency(b.total)} BDT*\n`;
      });
    }
    if (breakdown.income && breakdown.income.length > 0) {
      msg += `\n\uD83C\uDFF7\uFE0F *Income by Source:*\n`;
      breakdown.income.forEach(b => {
        msg += `  \u2022 ${b.category} (${b.count})  \u2014  *${formatCurrency(b.total)} BDT*\n`;
      });
    }
  }

  return msg;
};

const getDaysBetween = (start: Date, end: Date): number => {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// ─── HISTORY ─────────────────────────

export const historyEmpty = (mode?: UserMode): string => {
  const example = isPersonal(mode) ? '`Salary Amount`' : '`Product Price`';
  return (
    `\uD83D\uDCDC *Transaction History*${divider}` +
    `\uD83D\uDEAB No entries recorded yet.${divider}` +
    `\uD83D\uDCA1 _Type_ ${example} _to add an entry_\n` +
    `_Type_ \`-Amount\` _to add an expense_`
  );
};

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
  mode?: UserMode,
): string => {
  const icon = type === 'sale' ? '\uD83D\uDFE2' : '\uD83D\uDD34';
  const label =
    type === 'sale'
      ? isPersonal(mode)
        ? 'Income'
        : 'Sale'
      : 'Expense';

  return (
    `\u274C *Entry Deleted*${divider}` +
    `${icon} ${label}: *${name}*\n` +
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

export const errorInvalidInput = (mode?: UserMode): string => {
  if (isPersonal(mode)) {
    return (
      `\u26A0\uFE0F *Couldn\u2019t understand your input*\n\n` +
      `\uD83D\uDFE2 *To add income:*\n` +
      `  \`Salary 50000\` or \`50000 Salary\`\n\n` +
      `\uD83D\uDD34 *To add an expense:*\n` +
      `  \`-200\` or \`-500 Lunch\`\n` +
      `  \`-500 Lunch #food\` (with category)\n\n` +
      `Or use /addincome or /expense for guided entry.`
    );
  }
  return (
    `\u26A0\uFE0F *Couldn\u2019t understand your input*\n\n` +
    `\uD83D\uDFE2 *To add a sale:*\n` +
    `  \`Shirt 500\` or \`500 Shirt\`\n\n` +
    `\uD83D\uDD34 *To add an expense:*\n` +
    `  \`-50\` or \`-100 Tea\`\n\n` +
    `Or use /addsale or /expense for guided entry.`
  );
};

export const errorInvalidPrice = (): string =>
  `\u26A0\uFE0F *Invalid price*\n\n` +
  `Please enter a positive number.\n` +
  `_Example:_ \`500\` _or_ \`\u09EB\u09E6\u09E6\``;

export const errorInvalidProductName = (mode?: UserMode): string => {
  if (isPersonal(mode)) {
    return (
      `\u26A0\uFE0F *Invalid name*\n\n` +
      `Please enter a valid source name.\n` +
      `_Example: Salary, Freelance, Bonus_`
    );
  }
  return (
    `\u26A0\uFE0F *Invalid product name*\n\n` +
    `Please enter a valid product name.\n` +
    `_Example: Shirt, Rice, Blue Jeans_`
  );
};

export const errorDayClosed = (): string =>
  `\uD83D\uDD12 *Day Already Closed*\n\n` +
  `Today\u2019s ledger is locked.\n` +
  `New entries will be recorded for tomorrow.`;

// ─── SUBSCRIPTION TEMPLATES ─────────────────────────

export const subscribeMessage = (): string =>
  `\u2B50 *Upgrade to Pro*${divider}` +
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
  const planName = data.isPro ? '\u2B50 Pro' : '\uD83D\uDCCB Basic Khata (Free)';
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
