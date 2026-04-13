import { describe, it, expect } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('formats with thousands separator', () => {
    expect(formatPrice(1290000)).toBe('1,290,000원');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0원');
  });

  it('formats small number', () => {
    expect(formatPrice(59000)).toBe('59,000원');
  });
});
