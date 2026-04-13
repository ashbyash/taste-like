import { describe, it, expect } from 'vitest';
import {
  extractDomain,
  effectiveSubcategory,
  filterAndRank,
  FilterCandidate,
  PipelineError,
} from './pipeline';
import type { ScrapedProduct } from '@/types/product';

// ============================================
// Test Helpers
// ============================================

function makeCandidate(overrides: Partial<FilterCandidate> = {}): FilterCandidate {
  return {
    id: 'test-id',
    brand: 'ZARA',
    name: 'Test Item',
    price: 39000,
    category: 'bags',
    image_url: 'https://example.com/img.jpg',
    product_url: 'https://example.com/product',
    similarity: 0.85,
    ...overrides,
  };
}

function makeSource(overrides: Partial<ScrapedProduct> = {}): ScrapedProduct {
  return {
    brand: 'Saint Laurent',
    name: 'Kate Bag',
    price: 2000000,
    currency: 'KRW',
    category: 'bags',
    gender: 'women',
    image_url: 'https://ysl.com/img.jpg',
    product_url: 'https://ysl.com/kate',
    ...overrides,
  };
}

// ============================================
// filterAndRank
// ============================================

describe('filterAndRank', () => {
  // --- Edge cases (silent failure prevention) ---

  it('returns empty array when source.price is 0 (avoids NaN)', () => {
    const candidates = [makeCandidate({ price: 100 })];
    const source = makeSource({ price: 0 });
    const result = filterAndRank(candidates, source);
    // 100 > 0 * 0.5 → 100 > 0 → true → filtered out
    expect(result).toEqual([]);
  });

  it('returns empty array when source.price is negative', () => {
    const candidates = [makeCandidate({ price: 100 })];
    const source = makeSource({ price: -1000 });
    const result = filterAndRank(candidates, source);
    // 100 > -500 → true → filtered out
    expect(result).toEqual([]);
  });

  it('handles candidate.price = 0 with savings_percent = 100', () => {
    const candidates = [makeCandidate({ price: 0 })];
    const source = makeSource({ price: 1000000 });
    const result = filterAndRank(candidates, source);
    expect(result).toHaveLength(1);
    expect(result[0].savings_percent).toBe(100);
  });

  it('includes item at exactly 50% of source price (boundary)', () => {
    const candidates = [makeCandidate({ price: 50000 })];
    const source = makeSource({ price: 100000 });
    const result = filterAndRank(candidates, source);
    // 50000 > 100000 * 0.5 → 50000 > 50000 → false → included
    expect(result).toHaveLength(1);
    expect(result[0].savings_percent).toBe(50);
  });

  it('excludes item just above 50% of source price', () => {
    const candidates = [makeCandidate({ price: 50001 })];
    const source = makeSource({ price: 100000 });
    const result = filterAndRank(candidates, source);
    // 50001 > 50000 → true → filtered out
    expect(result).toEqual([]);
  });

  // --- Happy path ---

  it('calculates savings_percent correctly', () => {
    const candidates = [makeCandidate({ price: 59000 })];
    const source = makeSource({ price: 2000000 });
    const result = filterAndRank(candidates, source);
    expect(result).toHaveLength(1);
    // (2000000 - 59000) / 2000000 * 100 = 97.05 → rounds to 97
    expect(result[0].savings_percent).toBe(97);
  });

  it('filters out items exceeding price threshold', () => {
    const candidates = [
      makeCandidate({ price: 40000, brand: 'ZARA' }),
      makeCandidate({ price: 30000, brand: 'COS' }),
      makeCandidate({ price: 800000, brand: 'ARKET' }),
    ];
    const source = makeSource({ price: 100000 });
    const result = filterAndRank(candidates, source);
    // 800000 > 50000 → excluded
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.brand)).toEqual(['ZARA', 'COS']);
  });

  // --- Brand diversity ---

  it('limits max 3 items per brand', () => {
    const candidates = Array.from({ length: 5 }, (_, i) =>
      makeCandidate({ id: `id-${i}`, brand: 'ZARA', price: 10000 + i }),
    );
    const source = makeSource({ price: 100000 });
    const result = filterAndRank(candidates, source);
    expect(result).toHaveLength(3);
  });

  it('respects MAX_RESULTS = 10 limit', () => {
    const candidates = Array.from({ length: 15 }, (_, i) =>
      makeCandidate({ id: `id-${i}`, brand: `Brand${i}`, price: 10000 }),
    );
    const source = makeSource({ price: 100000 });
    const result = filterAndRank(candidates, source);
    expect(result).toHaveLength(10);
  });

  // --- Error case ---

  it('handles empty candidates array', () => {
    const source = makeSource();
    const result = filterAndRank([], source);
    expect(result).toEqual([]);
  });
});

// ============================================
// extractDomain
// ============================================

describe('extractDomain', () => {
  it('extracts domain and strips www prefix', () => {
    expect(extractDomain('https://www.ysl.com/ko-kr/bags/kate')).toBe('ysl.com');
  });

  it('handles URL without www', () => {
    expect(extractDomain('https://lemaire.fr/products/bag')).toBe('lemaire.fr');
  });

  it('preserves subdomains other than www', () => {
    expect(extractDomain('https://shop.miumiu.com/path')).toBe('shop.miumiu.com');
  });

  it('throws PipelineError on invalid URL', () => {
    expect(() => extractDomain('not-a-url')).toThrow(PipelineError);
    expect(() => extractDomain('not-a-url')).toThrow('올바른 URL을 입력해주세요');
  });

  it('throws PipelineError on empty string', () => {
    expect(() => extractDomain('')).toThrow(PipelineError);
  });
});

// ============================================
// effectiveSubcategory
// ============================================

describe('effectiveSubcategory', () => {
  it('returns null for null input', () => {
    expect(effectiveSubcategory(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(effectiveSubcategory(undefined)).toBeNull();
  });

  it('returns null for "other"', () => {
    expect(effectiveSubcategory('other')).toBeNull();
  });

  it('passes through valid subcategory', () => {
    expect(effectiveSubcategory('tote')).toBe('tote');
    expect(effectiveSubcategory('sneakers')).toBe('sneakers');
  });
});
