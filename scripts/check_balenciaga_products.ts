import { chromium } from 'playwright';

async function checkBalenciagaProducts() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('========== BALENCIAGA PRODUCT EXTRACTION TEST ==========\n');

    // Go to women's bags
    console.log('1. Navigating to women/bags with network tracing...');
    
    const requests: any[] = [];
    const requestHandler = (request: any) => {
      if (!request.url().includes('google-analytics') && !request.url().includes('cdn')) {
        requests.push(request.url().substring(0, 150));
      }
    };
    
    page.on('request', requestHandler);
    
    await page.goto('https://www.balenciaga.com/ko-kr/women/bags', { waitUntil: 'networkidle', timeout: 45000 });

    console.log(`  Page loaded. Network requests: ${requests.length}`);
    const apiReqs = requests.filter(r => r.includes('api') || r.includes('/api/'));
    if (apiReqs.length > 0) {
      console.log('  API endpoints detected:');
      apiReqs.slice(0, 5).forEach(r => console.log(`    ${r}`));
    }

    // Get all product links
    console.log('\n2. Extracting all product links:');
    const productLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/ko-kr/"]'))
        .filter((link: any) => {
          const href = link.getAttribute('href');
          return href && !href.includes('/') && href.length > 5;
        })
        .map((link: any) => ({
          href: link.getAttribute('href'),
          text: link.textContent?.trim().substring(0, 50),
        }))
        .slice(0, 10);
      
      return links;
    });

    console.log(`  Found ${productLinks.length} product links`);
    productLinks.forEach((link, i) => {
      console.log(`    ${i+1}. ${link.href} (${link.text})`);
    });

    // Test a specific product URL pattern
    if (productLinks.length > 0) {
      const testUrl = productLinks[0].href;
      console.log(`\n3. Testing product page: ${testUrl}`);
      
      await page.goto(`https://www.balenciaga.com${testUrl}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const productData = await page.evaluate(() => {
        // Get all visible text for product info
        const main = document.querySelector('main') || document.body;
        
        // Try different selectors for price
        const priceSelectors = ['[class*="price"]', '[aria-label*="price"]', '[data-price]', '.price'];
        let price = '';
        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            price = el.textContent?.trim() || '';
            if (price) break;
          }
        }

        // Get product name
        const titleSelectors = ['h1', '[class*="title"]', '[class*="name"]', 'h2'];
        let title = '';
        for (const sel of titleSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent && el.textContent.trim().length > 3) {
            title = el.textContent.trim();
            break;
          }
        }

        // Get image
        const img = document.querySelector('img[alt*="Product"], img[class*="product"]');

        return {
          title,
          price: price || 'Not found',
          imageUrl: (img as any)?.src || 'Not found',
          pageHtml: document.documentElement.outerHTML.substring(0, 500),
        };
      });

      console.log(`   Title: ${productData.title}`);
      console.log(`   Price: ${productData.price}`);
      console.log(`   Image: ${productData.imageUrl?.substring(0, 100)}`);
    }

    // Check page structure
    console.log('\n4. Checking page rendering:');
    const pageStructure = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
        .map((s: any) => {
          if (s.src) return `<src: ${s.src.substring(0, 80)}>`;
          if (s.type === 'application/json') return `<json: ${s.id || 'no-id'}>`;
          if (s.textContent?.includes('window.')) return `<window config>`;
          return null;
        })
        .filter(Boolean);

      return {
        hasReact: document.querySelector('[role="application"]') !== null,
        bodyClasses: document.body.className,
        mainElement: !!document.querySelector('main'),
        iframesCount: document.querySelectorAll('iframe').length,
        scriptTypes: scripts.slice(0, 10),
      };
    });

    console.log(`   Has React app marker: ${pageStructure.hasReact}`);
    console.log(`   Body classes: ${pageStructure.bodyClasses.substring(0, 100)}`);
    console.log(`   Has <main>: ${pageStructure.mainElement}`);
    console.log(`   Iframes: ${pageStructure.iframesCount}`);

    console.log('\n========== TEST COMPLETE ==========');
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}

checkBalenciagaProducts();
