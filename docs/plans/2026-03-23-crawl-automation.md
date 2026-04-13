# Crawl Automation Implementation Plan

> Project: [[taste-like]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate weekly crawling (all brands) + fashion description generation via GitHub Actions, with manual Colab embedding as the final step.

**Architecture:** Single GitHub Actions workflow with 3 jobs — API crawlers (no Playwright), Playwright crawlers (headless), and batch-describe (runs after both crawl jobs complete). Triggered weekly on Monday 6AM KST with manual dispatch option.

**Tech Stack:** GitHub Actions, Playwright (headless), Node.js 20, tsx

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `.github/workflows/weekly-crawl.yml` | Workflow: schedule, 3 jobs, secrets |
| Modify | `src/lib/scrapers/base.ts:44` | `headless` default from env var |
| Modify | `scripts/crawl.ts` | Add `--both-genders` flag for automation |

---

### Task 1: BaseCrawler headless mode from environment variable

**Files:**
- Modify: `src/lib/scrapers/base.ts:44`

Currently `headless` is hardcoded to `false`. In GitHub Actions there's no display, so Playwright must run headless.

- [ ] **Step 1: Change headless property to read from env**

```typescript
// line 44, change:
protected readonly headless: boolean = false;
// to:
protected readonly headless: boolean = process.env.HEADLESS === 'true';
```

- [ ] **Step 2: Verify locally with `HEADLESS=true npm run crawl -- zara --category bags --dry-run`**

Expected: browser window does NOT open, dry-run output shows products.

- [ ] **Step 3: Verify without env var (default behavior unchanged)**

Run: `npm run crawl -- zara --category bags --dry-run`
Expected: browser window opens as before.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/base.ts
git commit -m "feat: support HEADLESS env var in BaseCrawler for CI"
```

---

### Task 2: Add `--both-genders` flag to crawl CLI

**Files:**
- Modify: `scripts/crawl.ts`

Currently gender defaults to `women` and must be run twice for both. Automation needs a single command.

- [ ] **Step 1: Add `--both-genders` flag to parseArgs**

In `parseArgs`, add a `bothGenders` boolean and validate mutual exclusivity with `--gender`:

```typescript
let bothGenders = false;

// After the gender parsing block (around line 42), add:
if (arg === '--both-genders') { bothGenders = true; continue; }

// After the for loop, add validation:
if (bothGenders && gender) {
  console.error('Cannot use --both-genders with --gender. Choose one.');
  process.exit(1);
}

return { slugs: all ? [...ALL_AVAILABLE] : slugs, dryRun, category, gender, bothGenders };
```

- [ ] **Step 2: Update main() to loop over genders when `--both-genders`**

Move the full crawl dispatch logic (API crawler branching + registry routing) inside the gender loop:

```typescript
async function main() {
  const { slugs, dryRun, category, gender, bothGenders } = parseArgs(process.argv.slice(2));

  if (slugs.length === 0) {
    console.error(`Usage: npm run crawl -- <slug> [--all] [--category <cat>] [--gender women|men] [--both-genders] [--dry-run]`);
    console.error(`Available crawlers: ${ALL_AVAILABLE.join(', ')}`);
    process.exit(1);
  }

  const genders: Gender[] = bothGenders ? ['women', 'men'] : [gender ?? 'women'];

  let totalUpserted = 0;

  for (const g of genders) {
    console.log(`\n=== Gender: ${g} ===`);

    const options: CrawlOptions = {
      dryRun,
      categories: category ? [category] : undefined,
      gender: g,
    };

    for (const slug of slugs) {
      console.log(`\n[${slug}] Starting crawl...`);

      let result;
      if (slug === 'miu-miu') {
        result = await crawlMiumiu(options);
      } else if (slug === 'lemaire') {
        result = await crawlLemaire(options);
      } else if (slug === 'massimo-dutti') {
        result = await crawlMassimoDutti(options);
      } else {
        const crawler = await getCrawler(slug);
        result = await crawler.run(options);
      }

      totalUpserted += result.upserted;

      console.log(`[${slug}] Done: ${result.total} extracted, ${result.upserted} upserted, ${result.errors.length} errors`);
      if (result.errors.length > 0) {
        result.errors.forEach(e => console.error(`  - ${e.category}: ${e.message}`));
      }
    }
  }

  console.log(`\nAll done. Total upserted: ${totalUpserted}`);
}
```

- [ ] **Step 3: Test locally**

Run: `npm run crawl -- zara --category bags --both-genders --dry-run`
Expected: runs women first, then men, dry-run output for both.

- [ ] **Step 4: Commit**

```bash
git add scripts/crawl.ts
git commit -m "feat: add --both-genders flag to crawl CLI for automation"
```

---

### Task 3: Create GitHub Actions workflow

**Files:**
- Create: `.github/workflows/weekly-crawl.yml`

- [ ] **Step 1: Create workflow file**

```yaml
name: Weekly Crawl + Describe

on:
  schedule:
    # Monday 6AM KST = Sunday 21:00 UTC
    - cron: '0 21 * * 0'
  workflow_dispatch: # Manual trigger

env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  HEADLESS: 'true'

jobs:
  api-crawlers:
    name: API Crawlers (Miu Miu, Lemaire, Massimo Dutti)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      - name: Crawl Miu Miu (women only)
        continue-on-error: true
        run: node --import tsx scripts/crawl.ts miu-miu

      - name: Crawl Lemaire (both genders)
        continue-on-error: true
        run: node --import tsx scripts/crawl.ts lemaire --both-genders

      - name: Crawl Massimo Dutti (both genders)
        continue-on-error: true
        run: node --import tsx scripts/crawl.ts massimo-dutti --both-genders

  playwright-crawlers:
    name: Playwright Crawlers (ZARA, COS, ARKET, UNIQLO)
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright Chromium
        run: npx playwright install chromium --with-deps

      - name: Crawl ZARA (both genders)
        continue-on-error: true
        run: node --import tsx scripts/crawl.ts zara --both-genders

      - name: Crawl COS (both genders)
        continue-on-error: true
        run: node --import tsx scripts/crawl.ts cos --both-genders

      - name: Crawl ARKET (both genders)
        continue-on-error: true
        run: node --import tsx scripts/crawl.ts arket --both-genders

      - name: Crawl UNIQLO (both genders)
        continue-on-error: true
        run: node --import tsx scripts/crawl.ts uniqlo --both-genders

  batch-describe:
    name: Generate Fashion Descriptions
    needs: [api-crawlers, playwright-crawlers]
    runs-on: ubuntu-latest
    timeout-minutes: 120
    env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      DESCRIBE_TIMEOUT_MS: '15000'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      - name: Generate descriptions for new products
        run: node --import tsx scripts/batch-describe.ts
```

- [ ] **Step 2: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/weekly-crawl.yml'))"`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/weekly-crawl.yml
git commit -m "feat: add weekly crawl + describe GitHub Actions workflow"
```

---

### Task 4: Verify end-to-end locally (dry run)

- [ ] **Step 1: Test headless + both-genders with a single brand**

```bash
HEADLESS=true npm run crawl -- cos --both-genders --dry-run
```

Expected: no browser window, women + men dry-run output.

- [ ] **Step 2: Test API crawler (no Playwright needed)**

```bash
npm run crawl -- lemaire --both-genders --dry-run
```

Expected: women + men dry-run output.

- [ ] **Step 3: Push and verify workflow appears in GitHub Actions tab**

```bash
git push
```

Then check: GitHub repo → Actions tab → "Weekly Crawl + Describe" workflow should be visible.

- [ ] **Step 4: Trigger manual run from GitHub Actions tab**

Click "Run workflow" → monitor logs for all 3 jobs.

---

## Post-Automation Workflow (Manual Steps Remaining)

After the weekly workflow completes:

1. **Colab** — Open `notebooks/batch_embed.ipynb`, run all cells (embeds `embedding IS NULL` products)
2. **Supabase SQL Editor** — `DELETE FROM recommendation_cache;`
3. Done — new products are live with fresh embeddings

---

## GitHub Secrets Setup

User must add these in GitHub repo → Settings → Secrets and variables → Actions:

| Secret Name | Source |
|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` |
| `OPENAI_API_KEY` | `.env.local` |
