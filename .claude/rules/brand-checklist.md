# Brand Registration Completeness

When adding a new brand, ALL applicable registration points must be completed. Missing any causes silent production bugs.

## Always Required
1. `src/types/brand.ts` — BrandSlug union type
2. `next.config.ts` — remotePatterns image CDN hostname
3. `supported_brands` DB table — INSERT row

## Source Brands (luxury/input)
4. `src/types/brand.ts` — SOURCE_BRANDS array
5. `src/app/api/products/source/route.ts` — SLUG_TO_BRAND map
6. `src/lib/recommend/pipeline.ts` — ON_DEMAND_SCRAPERS (domain → scraper)

## Alternative Brands (spa/output)
7. `src/types/brand.ts` — ALTERNATIVE_BRAND_LABELS

## Batch Crawler
8. `src/lib/scrapers/registry.ts` — REGISTRY (BaseCrawler) or `scripts/crawl.ts` — API_CRAWLERS (custom API)

Never mark brand addition as complete without verifying all applicable points.
