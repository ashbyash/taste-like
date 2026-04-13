import { describe, it, expect } from 'vitest';
import { mapCategory, detectGender, YslScraperError } from './ysl';

// ============================================
// mapCategory
// ============================================

describe('mapCategory', () => {
  it('maps handbags keyword to bags', () => {
    expect(mapCategory('ysl_macro_women_handbags', undefined)).toBe('bags');
  });

  it('maps shoes keyword to shoes', () => {
    expect(mapCategory('ysl_macro_women_shoes', undefined)).toBe('shoes');
  });

  it('maps knitwear keyword to tops', () => {
    expect(mapCategory('ysl_macro_women_knitwear', undefined)).toBe('tops');
  });

  it('matches rightmost segment for multi-level categories', () => {
    // 'leather_jackets' should match from right
    expect(mapCategory('ysl_macro_women_leather_jackets', undefined)).toBe('outerwear');
  });

  it('falls back to microCategory when macro has no match', () => {
    expect(mapCategory('ysl_macro_women_unknown', 'sneakers')).toBe('shoes');
  });

  it('throws YslScraperError for unknown category', () => {
    expect(() => mapCategory('ysl_macro_women_perfume', 'fragrances'))
      .toThrow(YslScraperError);
  });

  it('throws when both macro and micro are undefined', () => {
    expect(() => mapCategory(undefined, undefined))
      .toThrow(YslScraperError);
  });
});

// ============================================
// detectGender
// ============================================

describe('detectGender', () => {
  it('detects men from _men_ in category string', () => {
    expect(detectGender('ysl_macro_men_shoes')).toBe('men');
  });

  it('detects men from ysl_macro_men prefix', () => {
    expect(detectGender('ysl_macro_men')).toBe('men');
  });

  it('defaults to women for women category', () => {
    expect(detectGender('ysl_macro_women_bags')).toBe('women');
  });

  it('defaults to women for undefined input', () => {
    expect(detectGender(undefined)).toBe('women');
  });

  it('defaults to women for empty string', () => {
    expect(detectGender('')).toBe('women');
  });
});
