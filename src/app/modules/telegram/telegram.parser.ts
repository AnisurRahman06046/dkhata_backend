export interface ParsedSaleInput {
  productName: string;
  price: number;
}

export interface ParsedExpenseInput {
  description: string;
  amount: number;
}

export type ParsedInput =
  | { type: 'sale'; data: ParsedSaleInput }
  | { type: 'expense'; data: ParsedExpenseInput };

const BANGLA_DIGITS: Record<string, string> = {
  '\u09E6': '0',
  '\u09E7': '1',
  '\u09E8': '2',
  '\u09E9': '3',
  '\u09EA': '4',
  '\u09EB': '5',
  '\u09EC': '6',
  '\u09ED': '7',
  '\u09EE': '8',
  '\u09EF': '9',
};

const MAX_AMOUNT = 10_000_000;

const normalizeBanglaDigits = (text: string): string => {
  return text.replace(/[\u09E6-\u09EF]/g, char => BANGLA_DIGITS[char] || char);
};

const isNumericToken = (token: string): boolean => {
  return /^\d+(\.\d+)?$/.test(token);
};

/**
 * Parse user message into a sale or expense.
 *
 * Sale patterns:
 *   "Shirt 500", "500 Shirt", "Rice 5kg 350"
 *
 * Expense patterns:
 *   "-50", "-100 Tea", "Tea -100"
 */
export const parseInput = (text: string): ParsedInput | null => {
  if (!text || typeof text !== 'string') return null;

  const normalized = normalizeBanglaDigits(text).trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  // Check for expense pattern: starts with "-"
  const expenseResult = parseExpenseInput(normalized);
  if (expenseResult) {
    return { type: 'expense', data: expenseResult };
  }

  // Otherwise try sale
  const saleResult = parseSaleInput(normalized);
  if (saleResult) {
    return { type: 'sale', data: saleResult };
  }

  return null;
};

export const parseSaleInput = (text: string): ParsedSaleInput | null => {
  if (!text || typeof text !== 'string') return null;

  const normalized = normalizeBanglaDigits(text).trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const tokens = normalized.split(' ');
  if (tokens.length < 2) return null;

  // Strategy 1: Last token is the price — "Shirt 500"
  const lastToken = tokens[tokens.length - 1];
  if (isNumericToken(lastToken)) {
    const price = parseFloat(lastToken);
    const productName = tokens.slice(0, -1).join(' ').trim();

    if (productName && price > 0 && price <= MAX_AMOUNT) {
      return { productName, price };
    }
  }

  // Strategy 2: First token is the price — "500 Shirt"
  const firstToken = tokens[0];
  if (isNumericToken(firstToken)) {
    const price = parseFloat(firstToken);
    const productName = tokens.slice(1).join(' ').trim();

    if (productName && price > 0 && price <= MAX_AMOUNT) {
      return { productName, price };
    }
  }

  return null;
};

export const parseExpenseInput = (text: string): ParsedExpenseInput | null => {
  if (!text || typeof text !== 'string') return null;

  const normalized = normalizeBanglaDigits(text).trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const tokens = normalized.split(' ');

  // Pattern 1: "-50" or "-100 Tea"
  if (tokens[0].startsWith('-')) {
    const amountStr = tokens[0].substring(1);
    if (isNumericToken(amountStr)) {
      const amount = parseFloat(amountStr);
      if (amount > 0 && amount <= MAX_AMOUNT) {
        const description = tokens.slice(1).join(' ').trim() || 'Expense';
        return { description, amount };
      }
    }
  }

  // Pattern 2: "Tea -100"
  const lastToken = tokens[tokens.length - 1];
  if (lastToken.startsWith('-') && tokens.length >= 2) {
    const amountStr = lastToken.substring(1);
    if (isNumericToken(amountStr)) {
      const amount = parseFloat(amountStr);
      if (amount > 0 && amount <= MAX_AMOUNT) {
        const description = tokens.slice(0, -1).join(' ').trim();
        return { description: description || 'Expense', amount };
      }
    }
  }

  return null;
};

export const parsePrice = (text: string): number | null => {
  if (!text) return null;

  const normalized = normalizeBanglaDigits(text).trim();
  if (!isNumericToken(normalized)) return null;

  const price = parseFloat(normalized);
  if (price <= 0 || price > MAX_AMOUNT) return null;

  return price;
};
