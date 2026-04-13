---
name: post-crawl
description: Run post-crawl processing steps. Use when user says "post-crawl", "크롤 후처리", or after completing a crawl run.
---

Run the post-crawl processing pipeline in order. Report results at each step.

## Steps

### 1. Subcategory Backfill
```bash
node --env-file=.env.local --import tsx scripts/update-subcategory.ts
```
Report: how many products updated.

### 2. Fashion Description (if new products lack descriptions)
```bash
node --env-file=.env.local --import tsx scripts/batch-describe.ts
```
Report: how many descriptions generated. Skip if user says unnecessary.

### 3. Batch Embedding (HF Space)
```bash
node --env-file=.env.local --import tsx scripts/batch-embed.ts
```
Report: how many embeddings generated. Skip if user says unnecessary.

### 4. Clear Recommendation Cache
Ask user for confirmation, then run via Supabase:
```sql
DELETE FROM recommendation_cache;
```
Or remind the user to run it in Supabase SQL Editor.

### 5. Verify Counts
```bash
node --env-file=.env.local --import tsx scripts/crawl-status.ts
```

Report summary table of counts.
