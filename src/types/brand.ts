export type BrandTier = 'luxury' | 'spa' | 'domestic_designer';
export type BrandRole = 'source' | 'alternative' | 'both';
export type Gender = 'women' | 'men';

export const CATEGORIES = [
  'bags',
  'shoes',
  'outerwear',
  'tops',
  'bottoms',
  'accessories',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const BAG_SUBCATEGORIES = [
  'tote', 'shoulder', 'crossbody', 'backpack', 'clutch',
  'mini', 'top-handle', 'hobo', 'bucket', 'other',
] as const;

export const SHOE_SUBCATEGORIES = [
  'sneakers', 'boots', 'loafers', 'sandals', 'pumps', 'other',
] as const;

export const BOTTOM_SUBCATEGORIES = [
  'skirts', 'pants', 'jeans', 'shorts', 'other',
] as const;

export type BagSubcategory = (typeof BAG_SUBCATEGORIES)[number];
export type ShoeSubcategory = (typeof SHOE_SUBCATEGORIES)[number];
export type BottomSubcategory = (typeof BOTTOM_SUBCATEGORIES)[number];
export type Subcategory = BagSubcategory | ShoeSubcategory | BottomSubcategory;

export interface SupportedBrand {
  id: string;
  name: string;
  name_ko: string | null;
  slug: string;
  tier: BrandTier;
  role: BrandRole;
  domain: string | null;
  url_pattern: string | null;
  crawl_sources: CrawlSource[];
  price_range: PriceRange | null;
  categories: Category[];
  scraper_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrawlSource {
  url: string;
  type: 'self' | 'musinsa' | '29cm' | 'naver';
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export type BrandSlug = 'saint-laurent' | 'miu-miu' | 'bottega-veneta' | 'prada' | 'balenciaga' | 'lemaire' | 'the-row';

export interface NavBrand {
  slug: BrandSlug;
  label: string;
  available: boolean;
}

// Source (luxury) brands shown in BrandNav
export const SOURCE_BRANDS: NavBrand[] = [
  { slug: 'saint-laurent', label: 'Saint Laurent', available: true },
  { slug: 'miu-miu', label: 'Miu Miu', available: true },
  { slug: 'lemaire', label: 'Lemaire', available: true },
  { slug: 'the-row', label: 'The Row', available: true },
];

// Alternative (SPA) brand labels for UI display
export const ALTERNATIVE_BRAND_LABELS = ['ZARA', 'COS', 'ARKET', 'UNIQLO', 'MASSIMO DUTTI'] as const;
