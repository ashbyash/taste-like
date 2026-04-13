import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Copy .env.local.example to .env.local and fill in the values');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const brands = [
  {
    name: 'Saint Laurent',
    name_ko: '생로랑',
    slug: 'saint-laurent',
    tier: 'luxury',
    role: 'source',
    domain: 'ysl.com',
    url_pattern: '/ko-kr/.+\\.html',
    crawl_sources: [],
    categories: ['bags', 'shoes', 'outerwear', 'tops', 'bottoms', 'accessories'],
    scraper_id: 'ysl',
  },
  {
    name: 'ZARA',
    name_ko: '자라',
    slug: 'zara',
    tier: 'spa',
    role: 'alternative',
    domain: 'zara.com',
    crawl_sources: [{ url: 'https://www.zara.com/kr/', type: 'self' }],
    categories: ['bags', 'shoes', 'outerwear', 'tops', 'bottoms', 'accessories'],
    scraper_id: 'zara',
  },
  {
    name: 'COS',
    name_ko: '코스',
    slug: 'cos',
    tier: 'spa',
    role: 'alternative',
    domain: 'cos.com',
    crawl_sources: [
      { url: 'https://www.cos.com/ko-kr/', type: 'self' },
      { url: 'https://www.musinsa.com/brands/cos', type: 'musinsa' },
    ],
    categories: ['bags', 'shoes', 'outerwear', 'tops', 'bottoms', 'accessories'],
    scraper_id: 'cos',
  },
];

async function seed() {
  console.log('Seeding supported_brands...');

  for (const brand of brands) {
    const { error } = await supabase
      .from('supported_brands')
      .upsert(brand, { onConflict: 'slug' });

    if (error) {
      console.error(`Failed to seed ${brand.name}:`, error.message);
    } else {
      console.log(`✓ ${brand.name} (${brand.tier}/${brand.role})`);
    }
  }

  console.log('Done.');
}

seed();
