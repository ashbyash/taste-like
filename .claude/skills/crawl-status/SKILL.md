---
name: crawl-status
description: Check DB product counts and data quality. Use when user says "crawl-status", "크롤 현황", "DB 현황", or wants to see product statistics.
---

Query Supabase and report product database health.

## Run This Query

```bash
node --env-file=.env.local --import tsx scripts/crawl-status.ts
```

## Report Format

Present results as a markdown table:

| Brand | Count |
|-------|-------|
| ... | ... |

| Metric | Value | Status |
|--------|-------|--------|
| Total | N | - |
| Missing embeddings | N | OK / Action needed |
| Missing descriptions | N | OK / Action needed |
| Missing subcategory | N | OK / Action needed |
| Cache entries | N | - |

If any "Missing" count > 0, suggest running `/post-crawl`.
