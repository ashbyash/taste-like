import { chromium } from 'playwright';

async function checkBalenciaga() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('========== BALENCIAGA WEBSITE CHECK ==========\n');

    // Set up request/response logging
    const requests: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api') || url.includes('.json') || url.includes('product')) {
        requests.push(`${url.substring(0, 120)} [${response.status()}]`);
      }
    });

    // Main page
    console.log('1. Checking main page: https://www.balenciaga.com/ko-kr');
    await page.goto('https://www.balenciaga.com/ko-kr', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.title();
    console.log(`   Title: ${title}\n`);

    // Check for __NEXT_DATA__
    const hasNextData = await page.evaluate(() => !!document.querySelector('#__NEXT_DATA__'));
    console.log(`   Has __NEXT_DATA__: ${hasNextData}`);

    if (hasNextData) {
      const nextDataContent = await page.evaluate(() => {
        const el = document.querySelector('#__NEXT_DATA__');
        return el?.textContent?.substring(0, 500) || '';
      });
      console.log(`   __NEXT_DATA__ sample: ${nextDataContent?.substring(0, 100)}...\n`);
    }

    // Category page
    console.log('2. Checking women/bags category page');
    await page.goto('https://www.balenciaga.com/ko-kr/women/bags', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const bagPageTitle = await page.title();
    console.log(`   Title: ${bagPageTitle}`);

    // Product elements
    const productInfo = await page.evaluate(() => {
      const productElements = document.querySelectorAll('[class*="product"], [data-id], article, [role="listitem"]');
      const productNames = Array.from(document.querySelectorAll('h2, h3, [class*="name"], [class*="title"]')).slice(0, 3);
      
      return {
        elementCount: productElements.length,
        sampleNames: productNames.map(el => el.textContent?.trim()).filter(Boolean).slice(0, 3),
      };
    });
    console.log(`   Product elements: ${productInfo.elementCount}`);
    console.log(`   Sample names: ${productInfo.sampleNames.join(', ')}\n`);

    // Check for JSON data in scripts
    console.log('3. Checking for embedded JSON data:');
    const scriptData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/json"]'));
      const nextScripts = Array.from(document.querySelectorAll('script#__NEXT_DATA__, script#__NEXT_DATA'));
      
      return {
        jsonScripts: scripts.length,
        nextDataScripts: nextScripts.length,
        allScriptCount: document.querySelectorAll('script').length,
      };
    });
    console.log(`   JSON script tags: ${scriptData.jsonScripts}`);
    console.log(`   __NEXT_DATA__ tags: ${scriptData.nextDataScripts}`);
    console.log(`   Total script tags: ${scriptData.allScriptCount}\n`);

    // API calls made
    console.log('4. API/Network requests captured:');
    const apiReqs = requests.filter(r => r.includes('/api') || r.includes('product'));
    if (apiReqs.length > 0) {
      apiReqs.slice(0, 5).forEach(r => console.log(`   ${r}`));
    } else {
      console.log('   (none captured - static page render)');
    }

    // Men's page
    console.log('\n5. Checking men/bags page (gender structure)');
    requests.length = 0; // reset
    await page.goto('https://www.balenciaga.com/ko-kr/men/bags', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const menInfo = await page.evaluate(() => {
      return {
        productCount: document.querySelectorAll('[class*="product"], [data-id], article').length,
        title: document.title,
      };
    });
    console.log(`   Title: ${menInfo.title}`);
    console.log(`   Product elements: ${menInfo.productCount}`);

    console.log('\n========== CHECK COMPLETE ==========');
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}

checkBalenciaga();
