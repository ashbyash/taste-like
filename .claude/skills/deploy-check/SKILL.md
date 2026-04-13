---
name: deploy-check
description: Pre-deploy verification beyond lint+build. Use when user says "deploy-check", "배포 전 확인", or before pushing to production.
---

Run comprehensive pre-deploy checks. This extends `/verify` (lint+build) with project-specific validations.

## Steps

### 1. Lint + Build
```bash
npm run lint && npm run build
```

### 2. Image CDN Completeness
Read `next.config.ts` remotePatterns and compare against actual brand image URLs in the DB:
```bash
node --env-file=.env.local --import tsx -e "
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await sb.from('products').select('image_url, brand').not('image_url', 'is', null);
const hosts = new Set<string>();
for (const p of data ?? []) {
  try { hosts.add(new URL(p.image_url).hostname); } catch {}
}
console.log('Image CDN hosts in DB:', [...hosts].sort().join(', '));
"
```
Then read `next.config.ts` and verify all hosts are listed in `remotePatterns`. Report any missing.

### 3. Source Brand Registration
Read `src/types/brand.ts` for `SOURCE_BRANDS` slugs, then verify each slug exists in:
- `src/app/api/products/source/route.ts` `SLUG_TO_BRAND`
- `src/lib/recommend/pipeline.ts` `ON_DEMAND_SCRAPERS` (check domain mapping exists)

Report any missing registrations.

### 4. Environment Variables
Read `.env.local` keys (names only, NOT values) and remind user to verify they are all set in Vercel dashboard.

### 5. Report

| Check | Status |
|-------|--------|
| Lint | Pass/Fail |
| Build | Pass/Fail |
| CDN hosts | All registered / Missing: X |
| SLUG_TO_BRAND | Complete / Missing: X |
| ON_DEMAND_SCRAPERS | Complete / Missing: X |
| Env vars reminder | Listed |

If all pass: "Ready to deploy."
If any fail: List specific issues to fix before deploying.
