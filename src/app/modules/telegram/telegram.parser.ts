export interface ParsedSaleInput {
  productName: string;
  price: number;
}

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

const MAX_PRICE = 10_000_000;

const normalizeBanglaDigits = (text: string): string => {
  return text.replace(/[\u09E6-\u09EF]/g, char => BANGLA_DIGITS[char] || char);
};

const isNumericToken = (token: string): boolean => {
  return /^\d+(\.\d+)?$/.test(token);
};

export const parseSaleInput = (text: string): ParsedSaleInput | null => {
  if (!text || typeof text !== 'string') return null;

  const normalized = normalizeBanglaDigits(text).trim().replace(/\s+/g, ' ');

  if (!normalized) return null;

  const tokens = normalized.split(' ');

  if (tokens.length < 2) return null;

  // Strategy 1: Last token is the price — "Shirt 500", "Blue Jeans 1200"
  const lastToken = tokens[tokens.length - 1];
  if (isNumericToken(lastToken)) {
    const price = parseFloat(lastToken);
    const productName = tokens.slice(0, -1).join(' ').trim();

    if (productName && price > 0 && price <= MAX_PRICE) {
      return { productName, price };
    }
  }

  // Strategy 2: First token is the price — "500 Shirt"
  const firstToken = tokens[0];
  if (isNumericToken(firstToken)) {
    const price = parseFloat(firstToken);
    const productName = tokens.slice(1).join(' ').trim();

    if (productName && price > 0 && price <= MAX_PRICE) {
      return { productName, price };
    }
  }

  return null;
};

export const parsePrice = (text: string): number | null => {
  if (!text) return null;

  const normalized = normalizeBanglaDigits(text).trim();

  if (!isNumericToken(normalized)) return null;

  const price = parseFloat(normalized);

  if (price <= 0 || price > MAX_PRICE) return null;

  return price;
};
