import { crawlMiumiu } from '../src/lib/scrapers/miumiu';
import { CATEGORIES, type Category } from '../src/types/brand';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Ensure .env.local is configured.');
  process.exit(1);
}

function parseArgs(args: string[]) {
  let dryRun = false;
  let category: Category | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') { dryRun = true; continue; }
    if (arg === '--category' && args[i + 1]) {
      const val = args[++i] as Category;
      if (!CATEGORIES.includes(val)) {
        console.error(`Invalid category: "${val}". Available: ${CATEGORIES.join(', ')}`);
        process.exit(1);
      }
      category = val;
      continue;
    }
  }

  return { dryRun, category };
}

async function main() {
  const { dryRun, category } = parseArgs(process.argv.slice(2));

  console.log(`[Miu Miu] Starting Algolia crawl...`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Gender: women (Miu Miu is women-only)`);
  if (category) console.log(`  Category: ${category}`);

  const result = await crawlMiumiu({
    dryRun,
    categories: category ? [category] : undefined,
  });

  console.log(`\n[Miu Miu] Done: ${result.total} extracted, ${result.upserted} upserted, ${result.errors.length} errors`);
  if (result.errors.length > 0) {
    result.errors.forEach(e => console.error(`  - ${e.category}: ${e.message}`));
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
