---
name: add-brand
description: Checklist for adding a new brand to the project. Use when user says "add-brand", "브랜드 추가", or wants to register a new brand.
---

Guide the user through adding a new brand step-by-step. Ask questions first, then generate the checklist.

## Step 1: Gather Info

Ask the user:
1. Brand name (English) and slug (lowercase, hyphenated)
2. Tier: `luxury` / `spa` / `domestic_designer`
3. Role: `source` (input URL) / `alternative` (recommendation output) / `both`
4. Crawler type: `base` (Playwright DOM) / `api` (custom API like Algolia/Shopify) / `none` (manual)
5. Image CDN hostname (from sample product image URL)
6. Gender support: `women` / `men` / `both`

## Step 2: Generate Checklist

Based on answers, generate a checklist with ONLY the applicable items. Mark each with a checkbox.

### Always Required

- [ ] **`src/types/brand.ts:63`** — Add `'slug'` to `BrandSlug` union type
- [ ] **`next.config.ts` remotePatterns** — Add `{ hostname: 'cdn.domain.com' }`
- [ ] **`supported_brands` DB table** — INSERT row via Supabase SQL Editor:
  ```sql
  INSERT INTO supported_brands (name, slug, tier, role, scraper_id)
  VALUES ('Brand Name', 'slug', 'tier', 'role', 'slug');
  ```

### Source Brand Only (role = source or both)

- [ ] **`src/types/brand.ts:72-76`** — Add to `SOURCE_BRANDS` array:
  ```typescript
  { slug: 'slug', label: 'Brand Name', available: true },
  ```
- [ ] **`src/app/api/products/source/route.ts:5-9`** — Add to `SLUG_TO_BRAND`:
  ```typescript
  'slug': 'Brand Name',
  ```
- [ ] **`src/lib/recommend/pipeline.ts:79-83`** — Add to `ON_DEMAND_SCRAPERS`:
  ```typescript
  'domain.com': scrapeNewProduct,
  ```
- [ ] Create on-demand scraper: `src/lib/scrapers/slug.ts` with `scrapeSlugProduct(url)` export

### Alternative Brand Only (role = alternative or both)

- [ ] **`src/types/brand.ts:79`** — Add to `ALTERNATIVE_BRAND_LABELS`:
  ```typescript
  export const ALTERNATIVE_BRAND_LABELS = [..., 'BRAND'] as const;
  ```

### Batch Crawler (BaseCrawler type)

- [ ] Create crawler: `src/lib/scrapers/slug.ts` with `SlugCrawler extends BaseCrawler`
- [ ] **`src/lib/scrapers/registry.ts`** — Add to `REGISTRY`:
  ```typescript
  slug: async () => {
    const { SlugCrawler } = await import('./slug');
    return new SlugCrawler();
  },
  ```

### API Crawler (custom API type)

- [ ] Create crawler: `src/lib/scrapers/slug.ts` with `crawlSlug()` export
- [ ] **`scripts/crawl.ts:7`** — Add to `API_CRAWLERS` tuple
- [ ] **`scripts/crawl.ts:73-80`** — Add conditional branch for the slug

### Post-Registration

- [ ] Run crawl: `npm run crawl -- slug --gender women` (and `--gender men` if applicable)
- [ ] Run subcategory backfill: `node --env-file=.env.local --import tsx scripts/update-subcategory.ts`
- [ ] Run Colab embedding: `notebooks/batch_embed.ipynb`
- [ ] Clear cache: `DELETE FROM recommendation_cache;`
- [ ] Verify via dev server or API call

## Important

- Do NOT skip any registration point. Missing entries cause silent bugs in production.
- For source brands: forgetting `SLUG_TO_BRAND` causes wrong brand's products to appear.
- For all brands: forgetting `next.config.ts` CDN causes broken images in production.
