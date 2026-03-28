import { parseSaleInput, parsePrice } from '../../src/app/modules/telegram/telegram.parser';

describe('parseSaleInput', () => {
  describe('valid inputs - product then price', () => {
    it('should parse "Shirt 500"', () => {
      expect(parseSaleInput('Shirt 500')).toEqual({
        productName: 'Shirt',
        price: 500,
      });
    });

    it('should parse "Blue Jeans 1200"', () => {
      expect(parseSaleInput('Blue Jeans 1200')).toEqual({
        productName: 'Blue Jeans',
        price: 1200,
      });
    });

    it('should parse "Rice 5kg 350"', () => {
      expect(parseSaleInput('Rice 5kg 350')).toEqual({
        productName: 'Rice 5kg',
        price: 350,
      });
    });

    it('should parse decimal prices "Shirt 499.99"', () => {
      expect(parseSaleInput('Shirt 499.99')).toEqual({
        productName: 'Shirt',
        price: 499.99,
      });
    });
  });

  describe('valid inputs - price then product', () => {
    it('should parse "500 Shirt"', () => {
      expect(parseSaleInput('500 Shirt')).toEqual({
        productName: 'Shirt',
        price: 500,
      });
    });

    it('should parse "1200 Blue Jeans"', () => {
      expect(parseSaleInput('1200 Blue Jeans')).toEqual({
        productName: 'Blue Jeans',
        price: 1200,
      });
    });
  });

  describe('Bangla numeral support', () => {
    it('should parse "Shirt ৫০০"', () => {
      expect(parseSaleInput('Shirt \u09EB\u09E6\u09E6')).toEqual({
        productName: 'Shirt',
        price: 500,
      });
    });

    it('should parse "৫০০ Shirt"', () => {
      expect(parseSaleInput('\u09EB\u09E6\u09E6 Shirt')).toEqual({
        productName: 'Shirt',
        price: 500,
      });
    });

    it('should parse "Lungi ১২০০"', () => {
      expect(parseSaleInput('Lungi \u09E7\u09E8\u09E6\u09E6')).toEqual({
        productName: 'Lungi',
        price: 1200,
      });
    });
  });

  describe('whitespace handling', () => {
    it('should handle extra whitespace "  Shirt   500  "', () => {
      expect(parseSaleInput('  Shirt   500  ')).toEqual({
        productName: 'Shirt',
        price: 500,
      });
    });

    it('should handle tabs and multiple spaces', () => {
      expect(parseSaleInput('  Blue  Jeans  1200  ')).toEqual({
        productName: 'Blue Jeans',
        price: 1200,
      });
    });
  });

  describe('invalid inputs', () => {
    it('should return null for empty string', () => {
      expect(parseSaleInput('')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(parseSaleInput(null as unknown as string)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(parseSaleInput(undefined as unknown as string)).toBeNull();
    });

    it('should return null for just a product name "Shirt"', () => {
      expect(parseSaleInput('Shirt')).toBeNull();
    });

    it('should return null for just a number "500"', () => {
      expect(parseSaleInput('500')).toBeNull();
    });

    it('should return null for word numbers "Shirt five hundred"', () => {
      expect(parseSaleInput('Shirt five hundred')).toBeNull();
    });

    it('should return null for negative price "Shirt -500"', () => {
      expect(parseSaleInput('Shirt -500')).toBeNull();
    });

    it('should return null for zero price "Shirt 0"', () => {
      expect(parseSaleInput('Shirt 0')).toBeNull();
    });

    it('should return null for price exceeding max "Shirt 99999999"', () => {
      expect(parseSaleInput('Shirt 99999999')).toBeNull();
    });

    it('should return null for whitespace only', () => {
      expect(parseSaleInput('   ')).toBeNull();
    });
  });
});

describe('parsePrice', () => {
  it('should parse "500"', () => {
    expect(parsePrice('500')).toBe(500);
  });

  it('should parse "499.99"', () => {
    expect(parsePrice('499.99')).toBe(499.99);
  });

  it('should parse Bangla numerals "৫০০"', () => {
    expect(parsePrice('\u09EB\u09E6\u09E6')).toBe(500);
  });

  it('should return null for "abc"', () => {
    expect(parsePrice('abc')).toBeNull();
  });

  it('should return null for "0"', () => {
    expect(parsePrice('0')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parsePrice('')).toBeNull();
  });

  it('should return null for negative numbers', () => {
    expect(parsePrice('-100')).toBeNull();
  });
});
