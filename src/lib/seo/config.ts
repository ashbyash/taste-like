import type { Category } from '@/types/brand';

export interface StyleCombo {
  slug: string;
  spaBrand: string;
  spaBrandKo: string;
  luxuryBrand: string;
  luxuryBrandKo: string;
  titleKo: string;
  descKo: string;
}

// Brand definitions for programmatic combo generation
const LUXURY_BRANDS = [
  { name: 'Saint Laurent', ko: '생로랑', slug: 'saint-laurent' },
  { name: 'Miu Miu', ko: '미우미우', slug: 'miu-miu' },
  { name: 'Lemaire', ko: '르메르', slug: 'lemaire' },
  { name: 'The Row', ko: '더로우', slug: 'the-row' },
] as const;

const SPA_BRANDS = [
  { name: 'ZARA', ko: '자라', slug: 'zara' },
  { name: 'COS', ko: 'COS', slug: 'cos' },
  { name: 'ARKET', ko: 'ARKET', slug: 'arket' },
  { name: 'UNIQLO', ko: '유니클로', slug: 'uniqlo' },
  { name: 'Massimo Dutti', ko: '마시모두띠', slug: 'massimo-dutti' },
] as const;

// Generate all combos: 4 luxury × 5 spa = 20 combos
// Title includes both keyword patterns for SEO coverage:
//   "자라에서 찾는 생로랑 스타일 | 생로랑맛 자라"
export const STYLE_COMBOS: StyleCombo[] = SPA_BRANDS.flatMap(spa =>
  LUXURY_BRANDS.map(luxury => ({
    slug: `${spa.slug}-${luxury.slug}-style`,
    spaBrand: spa.name,
    spaBrandKo: spa.ko,
    luxuryBrand: luxury.name,
    luxuryBrandKo: luxury.ko,
    titleKo: `${spa.ko}에서 찾는 ${luxury.ko} 스타일 | ${luxury.ko}맛 ${spa.ko}`,
    descKo: `AI 비주얼 유사도 분석으로 찾은 ${spa.ko}의 ${luxury.ko} 스타일 아이템. ${luxury.ko}맛 ${spa.ko} 대안을 확인하세요.`,
  })),
);

export const SEO_CATEGORIES: Category[] = [
  'bags', 'shoes', 'outerwear', 'tops', 'bottoms',
];

const CATEGORY_LABELS_KO: Record<string, string> = {
  bags: '가방',
  shoes: '신발',
  outerwear: '아우터',
  tops: '상의',
  bottoms: '하의',
};

export function getCategoryLabelKo(category: string): string {
  return CATEGORY_LABELS_KO[category] ?? category;
}

export function findCombo(slug: string): StyleCombo | undefined {
  return STYLE_COMBOS.find(c => c.slug === slug);
}
