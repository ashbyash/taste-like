import { chromium } from 'playwright';

async function checkBalenciagaDeep() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('========== DEEP BALENCIAGA ANALYSIS ==========\n');

    // Go to women's bags
    console.log('1. Navigating to women/bags page...');
    await page.goto('https://www.balenciaga.com/ko-kr/women/bags', { waitUntil: 'networkidle', timeout: 40000 });

    // Extract product data from DOM
    console.log('\n2. Extracting product data from DOM:');
    const products = await page.evaluate(() => {
      // Try multiple selectors
      const selectors = [
        '.product-item', '[data-product]', '[data-id]', 'article[role="listitem"]',
        '[class*="product"]', '.product', '.item', '[class*="card"]'
      ];

      let productElements = [] as any[];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          console.log(`Found ${els.length} elements with selector: ${sel}`);
          productElements = Array.from(els).slice(0, 3);
          break;
        }
      }

      return productElements.map((el: any) => {
        const attributes = Array.from(el.attributes || [])
          .map((attr: any) => `${attr.name}="${attr.value?.substring(0, 50)}"`)
          .join(', ');
        
        const text = el.textContent?.substring(0, 150);
        const html = el.innerHTML?.substring(0, 200);
        
        return {
          tag: el.tagName,
          className: el.className?.substring(0, 100),
          dataAttributes: Object.keys(el.dataset || {}),
          attributes,
          textContent: text,
          htmlSample: html,
        };
      });
    });

    console.log('\nProduct element structure:');
    products.forEach((p, i) => {
      console.log(`  Product ${i}:`);
      console.log(`    Tag: ${p.tag}, Class: ${p.className}`);
      console.log(`    Data attributes: ${p.dataAttributes.join(', ') || '(none)'}`);
      if (p.attributes) console.log(`    Attributes: ${p.attributes.substring(0, 100)}`);
    });

    // Check for API endpoints via window object
    console.log('\n3. Checking window object for API config:');
    const windowData = await page.evaluate(() => {
      const w = window as any;
      return {
        hasNextRouter: !!w.__NEXT_DATA__,
        hasReactRoot: !!w.__REACT_DEVTOOLS_GLOBAL_HOOK__,
        windowKeys: Object.keys(w).filter(k => 
          k.includes('api') || k.includes('Api') || k.includes('APP') || k.includes('app')
        ).slice(0, 10),
      };
    });
    console.log(`  Has __NEXT_DATA__: ${windowData.hasNextRouter}`);
    console.log(`  Window API keys: ${windowData.windowKeys.join(', ') || '(none)'}`);

    // Check network requests
    console.log('\n4. Making a product request to see API patterns:');
    const requests: any[] = [];
    const responseHandler = (response: any) => {
      const url = response.url();
      if (url.includes('.json') || url.includes('/api') || url.includes('product')) {
        requests.push({
          url: url.substring(0, 150),
          status: response.status(),
          headers: response.headers(),
        });
      }
    };
    
    page.on('response', responseHandler);

    // Scroll to trigger lazy loading
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await page.waitForTimeout(2000);

    console.log(`  Captured ${requests.length} relevant requests`);
    requests.slice(0, 3).forEach((r, i) => {
      console.log(`    ${i+1}. ${r.url} [${r.status}]`);
    });

    // Try clicking a product
    console.log('\n5. Attempting to click a product to see single product page:');
    const productLinks = await page.locator('a[href*="/ko-kr/"]').first();
    const href = await productLinks?.getAttribute('href');
    
    if (href) {
      console.log(`  Found product link: ${href?.substring(0, 100)}`);
      
      // Navigate to product page
      await page.goto(`https://www.balenciaga.com${href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const productPageData = await page.evaluate(() => {
        const priceEl = document.querySelector('[class*="price"]');
        const nameEl = document.querySelector('h1');
        const imgEl = document.querySelector('img[alt*="product"], img[class*="product"]');
        
        return {
          productName: nameEl?.textContent?.trim().substring(0, 100),
          price: priceEl?.textContent?.trim().substring(0, 50),
          imageUrl: (imgEl as any)?.src?.substring(0, 150),
          hasImage: !!imgEl,
          pageTitle: document.title,
        };
      });

      console.log(`  Product page title: ${productPageData.pageTitle}`);
      console.log(`  Product name: ${productPageData.productName}`);
      console.log(`  Price: ${productPageData.price}`);
      console.log(`  Has image: ${productPageData.hasImage}`);
    }

    console.log('\n========== ANALYSIS COMPLETE ==========');
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
}

checkBalenciagaDeep();
