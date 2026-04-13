import { scrapeYslProduct, YslScraperError } from '../src/lib/scrapers/ysl';

const url = process.argv[2];

if (!url) {
  console.log('Usage: node --env-file=.env.local --import tsx scripts/test-ysl-scraper.ts <YSL_URL>');
  console.log('');
  console.log('Examples:');
  console.log('  https://www.ysl.com/ko-kr/mini-bags/le-5-a-7-mini-bag-in-grained-leather-710318BWR6W1000.html');
  console.log('  https://www.ysl.com/ko-kr/shoulder-bags/le-5-a-7-supple-small-in-lambskin-7572832R20W1000.html');
  process.exit(1);
}

async function main() {
  console.log(`Scraping: ${url}`);
  console.log('---');

  const start = Date.now();

  try {
    const product = await scrapeYslProduct(url);
    const elapsed = Date.now() - start;

    console.log('Result:');
    console.log(`  Brand:    ${product.brand}`);
    console.log(`  Name:     ${product.name}`);
    console.log(`  Price:    ${product.currency} ${product.price.toLocaleString()}`);
    console.log(`  Category: ${product.category}`);
    console.log(`  Image:    ${product.image_url.slice(0, 80)}...`);
    console.log(`  URL:      ${product.product_url}`);
    if (product.description) {
      console.log(`  Desc:     ${product.description.slice(0, 100)}...`);
    }
    console.log('---');
    console.log(`Done in ${elapsed}ms`);
  } catch (err) {
    const elapsed = Date.now() - start;
    if (err instanceof YslScraperError) {
      console.error(`YslScraperError [${err.code}]: ${err.message}`);
    } else {
      console.error('Unexpected error:', err);
    }
    console.log(`Failed in ${elapsed}ms`);
    process.exit(1);
  }
}

main();
