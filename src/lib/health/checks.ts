import { supabaseAdmin } from '@/lib/supabase/server';

type CheckStatus = 'ok' | 'warn' | 'error';

interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  details?: string[];
}

export interface HealthReport {
  timestamp: string;
  checks: CheckResult[];
  overallStatus: CheckStatus;
  durationMs: number;
}

const ALL_BRANDS = [
  'Saint Laurent', 'Miu Miu', 'Lemaire', 'The Row',
  'ZARA', 'COS', 'ARKET', 'UNIQLO', 'Massimo Dutti',
] as const;

const FRESHNESS_DAYS = 3;
const MIN_PRODUCT_COUNT = 50;
const EMBEDDING_WARN_PCT = 10;

// --- Check 1: Data Freshness ---

async function checkDataFreshness(): Promise<CheckResult> {
  const threshold = Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
  const stale: string[] = [];

  const results = await Promise.all(
    ALL_BRANDS.map(async (brand) => {
      const { data } = await supabaseAdmin
        .from('products')
        .select('crawled_at')
        .eq('brand', brand)
        .eq('is_available', true)
        .order('crawled_at', { ascending: false })
        .limit(1)
        .single();
      return { brand, lastCrawl: data?.crawled_at ?? null };
    }),
  );

  for (const { brand, lastCrawl } of results) {
    if (!lastCrawl || new Date(lastCrawl).getTime() < threshold) {
      const ago = lastCrawl
        ? `${Math.round((Date.now() - new Date(lastCrawl).getTime()) / 86400000)}d ago`
        : 'never';
      stale.push(`${brand} (${ago})`);
    }
  }

  return {
    name: 'Data Freshness',
    status: stale.length > 0 ? 'warn' : 'ok',
    message: stale.length > 0
      ? `${stale.length} brand(s) stale (>${FRESHNESS_DAYS}d)`
      : `All brands crawled within ${FRESHNESS_DAYS} days`,
    details: stale.length > 0 ? stale : undefined,
  };
}

// --- Check 2: Product Counts ---

async function checkProductCounts(): Promise<CheckResult> {
  const low: string[] = [];

  const results = await Promise.all(
    ALL_BRANDS.map(async (brand) => {
      const { count } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('brand', brand)
        .eq('is_available', true);
      return { brand, count: count ?? 0 };
    }),
  );

  for (const { brand, count } of results) {
    if (count < MIN_PRODUCT_COUNT) {
      low.push(`${brand}: ${count}`);
    }
  }

  return {
    name: 'Product Count',
    status: low.length > 0 ? 'warn' : 'ok',
    message: low.length > 0
      ? `${low.length} brand(s) below ${MIN_PRODUCT_COUNT} products`
      : `All brands have ${MIN_PRODUCT_COUNT}+ products`,
    details: low.length > 0 ? low : undefined,
  };
}

// --- Check 3: Embedding Coverage ---

async function checkEmbeddingCoverage(): Promise<CheckResult> {
  const [totalRes, missingRes] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true),
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true)
      .is('embedding', null),
  ]);

  const total = totalRes.count ?? 0;
  const missing = missingRes.count ?? 0;
  const pct = total > 0 ? (missing / total) * 100 : 0;

  return {
    name: 'Embedding Coverage',
    status: pct > EMBEDDING_WARN_PCT ? 'warn' : 'ok',
    message: `${missing}/${total} missing (${pct.toFixed(1)}%)`,
  };
}

// --- Check 4: Image Validity (sampling) ---

async function checkImageValidity(): Promise<CheckResult> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('image_url, brand')
    .eq('is_available', true)
    .not('image_url', 'is', null)
    .limit(20);

  if (!data || data.length === 0) {
    return { name: 'Image Validity', status: 'warn', message: 'No products to check' };
  }

  const samples = data.sort(() => Math.random() - 0.5).slice(0, 3);
  const broken: string[] = [];

  await Promise.all(
    samples.map(async (p) => {
      try {
        const res = await fetch(p.image_url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) broken.push(`${p.brand}: HTTP ${res.status}`);
      } catch {
        broken.push(`${p.brand}: timeout/error`);
      }
    }),
  );

  return {
    name: 'Image Validity',
    status: broken.length > 0 ? 'warn' : 'ok',
    message: broken.length > 0
      ? `${broken.length}/3 sampled images broken`
      : '3/3 sampled images OK',
    details: broken.length > 0 ? broken : undefined,
  };
}

// --- Check 5: Recommend API ---

async function checkRecommendApi(baseUrl: string): Promise<CheckResult> {
  try {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('brand_tier', 'luxury')
      .eq('is_available', true)
      .not('embedding', 'is', null)
      .limit(1)
      .single();

    if (!product) {
      return { name: 'Recommend API', status: 'warn', message: 'No test product found in DB' };
    }

    const res = await fetch(`${baseUrl}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
      signal: AbortSignal.timeout(8000),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        name: 'Recommend API',
        status: 'error',
        message: `HTTP ${res.status}: ${json.error ?? 'unknown'}`,
      };
    }

    const count = json.data?.recommendations?.length ?? 0;
    return {
      name: 'Recommend API',
      status: count > 0 ? 'ok' : 'warn',
      message: count > 0 ? `OK (${count} recommendations)` : '0 recommendations returned',
    };
  } catch (err) {
    return {
      name: 'Recommend API',
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// --- Runner ---

export async function runHealthChecks(baseUrl: string): Promise<HealthReport> {
  const start = Date.now();

  const checks = await Promise.all([
    checkDataFreshness(),
    checkProductCounts(),
    checkEmbeddingCoverage(),
    checkImageValidity(),
    checkRecommendApi(baseUrl),
  ]);

  const overallStatus: CheckStatus = checks.some(c => c.status === 'error')
    ? 'error'
    : checks.some(c => c.status === 'warn')
      ? 'warn'
      : 'ok';

  return {
    timestamp: new Date().toISOString(),
    checks,
    overallStatus,
    durationMs: Date.now() - start,
  };
}

// --- Formatter ---

const STATUS_EMOJI: Record<CheckStatus, string> = {
  ok: '\u2705',
  warn: '\u26a0\ufe0f',
  error: '\u274c',
};

export function formatReport(report: HealthReport): string {
  const header = `${STATUS_EMOJI[report.overallStatus]} *taste-like Health Check*`;
  const time = `_${report.timestamp}_ (${report.durationMs}ms)`;

  const lines = report.checks.map((c) => {
    let line = `${STATUS_EMOJI[c.status]} *${c.name}*: ${c.message}`;
    if (c.details?.length) {
      line += '\n' + c.details.map(d => `  - ${d}`).join('\n');
    }
    return line;
  });

  return [header, time, '', ...lines].join('\n');
}
