import type { BagSubcategory, BottomSubcategory, ShoeSubcategory, Subcategory } from '@/types/brand';

// ============================================
// Miu Miu: Algolia Breadcrumbs.level_2 → normalized
// ============================================

const MIUMIU_BAG_MAP: Record<string, BagSubcategory> = {
  'TOP HANDLES': 'top-handle',
  'MINI BAGS': 'mini',
  'BACKPACKS': 'backpack',
  'HOBO BAGS': 'hobo',
  'TOTES': 'tote',
  'BUCKET BAGS': 'bucket',
  'SHOULDER BAGS': 'shoulder',
  'BAGS': 'other',
  'ACCESSORIES': 'other',
};

const MIUMIU_SHOE_MAP: Record<string, ShoeSubcategory> = {
  'LOAFERS AND LACE-UPS': 'loafers',
  'SNEAKERS': 'sneakers',
  'BALLERINAS': 'pumps',
  'BOOTS AND ANKLE BOOTS': 'boots',
  'PUMPS': 'pumps',
  'SHOES': 'other',
};

const MIUMIU_BOTTOM_MAP: Record<string, BottomSubcategory> = {
  'SKIRTS': 'skirts',
  'PANTS AND SHORTS': 'pants',
};

export function mapMiumiuSubcategory(
  category: string,
  level2: string,
): Subcategory | null {
  if (category === 'bags') return MIUMIU_BAG_MAP[level2] ?? 'other';
  if (category === 'shoes') return MIUMIU_SHOE_MAP[level2] ?? 'other';
  if (category === 'bottoms') return MIUMIU_BOTTOM_MAP[level2] ?? 'other';
  return null;
}

// ============================================
// YSL: microCategory keyword → normalized
// ============================================

const YSL_BAG_MAP: Record<string, BagSubcategory> = {
  handbags: 'top-handle',
  shoulder_bags: 'shoulder',
  tote_bags: 'tote',
  crossbody_bags: 'crossbody',
  messenger_and_crossbody: 'crossbody',
  clutch: 'clutch',
  mini_bags: 'mini',
  backpacks: 'backpack',
  sac_de_jour: 'top-handle',
  id_bags: 'shoulder',
  totes: 'tote',
  luggage: 'other',
};

const YSL_SHOE_MAP: Record<string, ShoeSubcategory> = {
  boots: 'boots',
  sneakers: 'sneakers',
  sandals: 'sandals',
  loafers: 'loafers',
  pumps: 'pumps',
  mules: 'sandals',
  flats: 'loafers',
  derbies: 'loafers',
};

const YSL_BOTTOM_MAP: Record<string, BottomSubcategory> = {
  skirts: 'skirts',
  pants: 'pants',
  trousers: 'pants',
  jeans: 'jeans',
  denim: 'jeans',
  shorts: 'shorts',
};

export function mapYslSubcategory(
  category: string,
  microCategory: string,
): Subcategory | null {
  const key = microCategory.toLowerCase();
  if (category === 'bags') return YSL_BAG_MAP[key] ?? 'other';
  if (category === 'shoes') return YSL_SHOE_MAP[key] ?? 'other';
  if (category === 'bottoms') return YSL_BOTTOM_MAP[key] ?? 'other';
  return null;
}

// ============================================
// ZARA/COS: product name keyword → normalized
// ============================================

const BAG_KEYWORDS: [RegExp, BagSubcategory][] = [
  // Korean (ZARA)
  [/백팩/i, 'backpack'],
  [/토트/i, 'tote'],
  [/쇼퍼/i, 'tote'],
  [/숄더/i, 'shoulder'],
  [/크로스/i, 'crossbody'],
  [/버킷/i, 'bucket'],
  [/클러치/i, 'clutch'],
  [/미니\s*백/i, 'mini'],
  [/호보/i, 'hobo'],
  [/볼링/i, 'other'],
  [/핸드백/i, 'top-handle'],
  // English (COS)
  [/BACKPACK/i, 'backpack'],
  [/TOTE/i, 'tote'],
  [/SHOPPER/i, 'tote'],
  [/SHOULDER/i, 'shoulder'],
  [/CROSSBODY/i, 'crossbody'],
  [/MESSENGER/i, 'crossbody'],
  [/BUCKET/i, 'bucket'],
  [/CLUTCH/i, 'clutch'],
  [/MINI BAG/i, 'mini'],
  [/HOBO/i, 'hobo'],
  [/BOWLING/i, 'other'],
  [/BELT BAG/i, 'crossbody'],
];

const SHOE_KEYWORDS: [RegExp, ShoeSubcategory][] = [
  // Korean (ZARA)
  [/스니커즈/i, 'sneakers'],
  [/부츠/i, 'boots'],
  [/로퍼/i, 'loafers'],
  [/샌들/i, 'sandals'],
  [/발레리나/i, 'pumps'],
  [/펌프스/i, 'pumps'],
  [/힐\s*(슈즈|샌들)/i, 'pumps'],
  [/뮬/i, 'sandals'],
  [/플랫\s*슈즈/i, 'loafers'],
  // English (COS)
  [/TRAINER/i, 'sneakers'],
  [/SNEAKER/i, 'sneakers'],
  [/BOOT/i, 'boots'],
  [/LOAFER/i, 'loafers'],
  [/SANDAL/i, 'sandals'],
  [/MULE/i, 'sandals'],
  [/PUMP/i, 'pumps'],
  [/BALLET/i, 'pumps'],
  [/FLAT/i, 'loafers'],
  [/DERBY/i, 'loafers'],
  [/OXFORD/i, 'loafers'],
  [/HIKING/i, 'boots'],
];

const BOTTOM_KEYWORDS: [RegExp, BottomSubcategory][] = [
  // Korean (ZARA)
  [/스커트/i, 'skirts'],
  [/치마/i, 'skirts'],
  [/팬츠/i, 'pants'],
  [/트라우저/i, 'pants'],
  [/슬랙스/i, 'pants'],
  [/청바지/i, 'jeans'],
  [/데님/i, 'jeans'],
  [/반바지/i, 'shorts'],
  [/쇼츠/i, 'shorts'],
  // English (COS)
  [/SKIRT/i, 'skirts'],
  [/TROUSER/i, 'pants'],
  [/PANT(?!Y)/i, 'pants'],
  [/JEAN/i, 'jeans'],
  [/DENIM/i, 'jeans'],
  [/SHORT(?!S?\s*SLEEVE)/i, 'shorts'],
];

export function mapNameToSubcategory(
  category: string,
  name: string,
): Subcategory | null {
  if (category === 'bags') {
    for (const [re, sub] of BAG_KEYWORDS) {
      if (re.test(name)) return sub;
    }
    return 'other';
  }
  if (category === 'shoes') {
    for (const [re, sub] of SHOE_KEYWORDS) {
      if (re.test(name)) return sub;
    }
    return 'other';
  }
  if (category === 'bottoms') {
    for (const [re, sub] of BOTTOM_KEYWORDS) {
      if (re.test(name)) return sub;
    }
    return 'other';
  }
  return null;
}
