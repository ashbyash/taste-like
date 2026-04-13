import { describe, it, expect } from 'vitest';
import { mapNameToSubcategory } from './mappings';

describe('mapNameToSubcategory', () => {
  // --- Bags ---

  it('maps Korean bag name: 토트 → tote', () => {
    expect(mapNameToSubcategory('bags', '미디엄 토트백')).toBe('tote');
  });

  it('maps Korean bag name: 숄더 → shoulder', () => {
    expect(mapNameToSubcategory('bags', '미디엄 숄더백')).toBe('shoulder');
  });

  it('maps English bag name: CROSSBODY → crossbody', () => {
    expect(mapNameToSubcategory('bags', 'QUILTED CROSSBODY BAG')).toBe('crossbody');
  });

  it('returns other for unmatched bag name', () => {
    expect(mapNameToSubcategory('bags', '클래식 레더 백')).toBe('other');
  });

  // --- Shoes ---

  it('maps Korean shoe name: 스니커즈 → sneakers', () => {
    expect(mapNameToSubcategory('shoes', '가죽 스니커즈')).toBe('sneakers');
  });

  it('maps English shoe name: BOOTS → boots', () => {
    expect(mapNameToSubcategory('shoes', 'LEATHER CHELSEA BOOTS')).toBe('boots');
  });

  it('returns other for unmatched shoe name', () => {
    expect(mapNameToSubcategory('shoes', '레더 슈즈')).toBe('other');
  });

  // --- Bottoms ---

  it('maps Korean bottom name: 팬츠 → pants', () => {
    expect(mapNameToSubcategory('bottoms', '와이드 팬츠')).toBe('pants');
  });

  it('maps English bottom name: TROUSERS → pants', () => {
    expect(mapNameToSubcategory('bottoms', 'WIDE-LEG TROUSERS')).toBe('pants');
  });

  // --- Regex edge cases ---

  it('SHORT does not match SHORT SLEEVE (negative lookahead)', () => {
    expect(mapNameToSubcategory('bottoms', 'SHORT SLEEVE TOP')).toBe('other');
  });

  it('PANT does not match PANTY (negative lookahead)', () => {
    expect(mapNameToSubcategory('bottoms', 'PANTY HOSE')).toBe('other');
  });

  it('SHORT matches standalone SHORTS', () => {
    expect(mapNameToSubcategory('bottoms', 'BERMUDA SHORTS')).toBe('shorts');
  });

  // --- Non-subcategorized categories ---

  it('returns null for tops category', () => {
    expect(mapNameToSubcategory('tops', '오버사이즈 셔츠')).toBeNull();
  });

  it('returns null for outerwear category', () => {
    expect(mapNameToSubcategory('outerwear', '코트')).toBeNull();
  });

  it('returns null for accessories category', () => {
    expect(mapNameToSubcategory('accessories', '벨트')).toBeNull();
  });
});
