import { describe, expect, test } from 'bun:test';
import { formatPrice, formatDate, formatTable } from '../src/output';

describe('output utilities', () => {
  describe('formatPrice', () => {
    test('formats price with default currency', () => {
      expect(formatPrice(29.90)).toBe('29.90 CZK');
    });

    test('formats price with custom currency', () => {
      expect(formatPrice(29.90, 'EUR')).toBe('29.90 EUR');
    });

    test('handles zero', () => {
      expect(formatPrice(0)).toBe('0.00 CZK');
    });
  });

  describe('formatDate', () => {
    test('formats ISO date string', () => {
      const result = formatDate('2025-01-15');
      expect(result).toContain('2025');
    });

    test('handles invalid date', () => {
      const result = formatDate('invalid');
      expect(result === 'invalid' || result === 'Invalid Date').toBe(true);
    });
  });

  describe('formatTable', () => {
    test('formats items as table', () => {
      const items = [
        { name: 'Milk', price: 29.90 },
        { name: 'Bread', price: 19.90 }
      ];
      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price' }
      ];

      const result = formatTable(items, columns);
      expect(result).toContain('Name');
      expect(result).toContain('Price');
      expect(result).toContain('Milk');
      expect(result).toContain('Bread');
    });

    test('handles empty items', () => {
      expect(formatTable([], [{ key: 'name', label: 'Name' }])).toBe('No items found.');
    });
  });
});
