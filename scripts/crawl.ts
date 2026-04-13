import { getCrawler, ALL_SLUGS } from '../src/lib/scrapers/registry';
import { crawlMiumiu } from '../src/lib/scrapers/miumiu';
import { crawlLemaire } from '../src/lib/scrapers/lemaire';
import { crawlMassimoDutti } from '../src/lib/scrapers/massimo-dutti';
import { crawlYsl } from '../src/lib/scrapers/ysl';
import { crawlTheRow } from '../src/lib/scrapers/therow';
import { CATEGORIES, type Category, type Gender } from '../src/types/brand';
import type { CrawlOptions } from '../src/lib/scrapers/base';

const API_CRAWLERS = ['miu-miu', 'lemaire', 'massimo-dutti', 'saint-laurent', 'the-row'] as const;
const ALL_AVAILABLE = [...ALL_SLUGS, ...API_CRAWLERS];

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Ensure .env.local is configured.');
  process.exit(1);
}

function parseArgs(args: string[]) {
  const slugs: string[] = [];
  let all = false;
  let dryRun = false;
  let category: Category | undefined;
  let gender: Gender | undefined;
  let bothGenders = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all') { all = true; continue; }
    if (arg === '--dry-run') { dryRun = true; continue; }
    if (arg === '--both-genders') { bothGenders = true; continue; }
    if (arg === '--category' && args[i + 1]) {
      const val = args[++i] as Category;
      if (!CATEGORIES.includes(val)) {
        console.error(`Invalid category: "${val}". Available: ${CATEGORIES.join(', ')}`);
        process.exit(1);
      }
      category = val;
      continue;
    }
    if (arg === '--gender' && args[i + 1]) {
      const val = args[++i] as Gender;
      if (val !== 'women' && val !== 'men') {
        console.error(`Invalid gender: "${val}". Available: women, men`);
        process.exit(1);
      }
      gender = val;
      continue;
    }
    if (!arg.startsWith('--')) slugs.push(arg);
  }

  if (bothGenders && gender) {
    console.error('Cannot use --both-genders with --gender. Choose one.');
    process.exit(1);
  }

  return { slugs: all ? [...ALL_AVAILABLE] : slugs, dryRun, category, gender, bothGenders };
}

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
      } else if (slug === 'saint-laurent') {
        result = await crawlYsl(options);
      } else if (slug === 'the-row') {
        result = await crawlTheRow(options);
      } else {
        const crawler = await getCrawler(slug);
        result = await crawler.run(options);
      }

      totalUpserted += result.upserted;

      const staleInfo = result.staleRemoved ? `, ${result.staleRemoved} stale removed` : '';
      console.log(`[${slug}] Done: ${result.total} extracted, ${result.upserted} upserted, ${result.errors.length} errors${staleInfo}`);
      if (result.errors.length > 0) {
        result.errors.forEach(e => console.error(`  - ${e.category}: ${e.message}`));
      }
    }
  }

  console.log(`\nAll done. Total upserted: ${totalUpserted}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
