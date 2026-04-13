import { chromium } from 'playwright';
import * as fs from 'fs';

async function checkBalenciagaHTML() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('========== BALENCIAGA HTML STRUCTURE ==========\n');

    // Go to women's bags
    console.log('Fetching women/bags page...');
    await page.goto('https://www.balenciaga.com/ko-kr/women/bags', { waitUntil: 'networkidle', timeout: 45000 });

    // Save full HTML for analysis
    const html = await page.content();
    
    console.log(`Page size: ${html.length} bytes\n`);

    // Search for specific patterns
    console.log('1. Searching for data patterns:');
    
    if (html.includes('__NEXT_DATA__')) {
      console.log('   ✓ Found __NEXT_DATA__');
    } else {
      console.log('   ✗ No __NEXT_DATA__');
    }

    if (html.includes('"products"') || html.includes("'products'")) {
      console.log('   ✓ Found "products" in HTML');
    } else {
      console.log('   ✗ No "products" reference');
    }

    if (html.includes('data-product') || html.includes('data-id')) {
      console.log('   ✓ Found data attributes');
    } else {
      console.log('   ✗ No data attributes');
    }

    // Check for script JSON data
    const scriptJsonRegex = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
    const jsonScripts = html.match(scriptJsonRegex) || [];
    console.log(`\n2. JSON script tags found: ${jsonScripts.length}`);

    // Check for data in body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
    if (bodyMatch) {
      const bodyContent = bodyMatch[1];
      console.log(`\n3. Body content size: ${bodyContent.length} bytes`);
      
      // Look for product-like patterns
      const productMatches = bodyContent.match(/"name"/g) || [];
      const priceMatches = bodyContent.match(/"price"/g) || [];
      
      console.log(`   - Possible product names: ${productMatches.length}`);
      console.log(`   - Possible prices: ${priceMatches.length}`);
    }

    // Check for specific Balenciaga patterns
    console.log('\n4. Balenciaga-specific patterns:');
    if (html.includes('class="product') || html.includes('class="product-')) {
      console.log('   ✓ Found .product* CSS classes');
    } else {
      console.log('   ✗ No .product* CSS classes');
    }

    if (html.includes('data-commerce') || html.includes('data-product-id')) {
      console.log('   ✓ Found commerce data attributes');
    } else {
      console.log('   ✗ No commerce data attributes');
    }

    // Extract sample of product-related HTML
    console.log('\n5. Sample product HTML structure:');
    const liMatch = html.match(/<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]{0,500}<\/li>/);
    if (liMatch) {
      const sample = liMatch[0].substring(0, 300);
      console.log(`   Found LI with product class: ${sample}...`);
    } else {
      console.log('   No LI with product class found');
    }

    // Check for specific URLs that look like products
    const urlMatches = html.match(/href="\/ko-kr\/[^"]{10,100}"/g) || [];
    console.log(`\n6. Product-like URLs found: ${urlMatches.length}`);
    if (urlMatches.length > 0) {
      const sampleUrls = new Set(urlMatches.slice(0, 5));
      sampleUrls.forEach(url => {
        console.log(`   ${url}`);
      });
    }

    // Framework detection
    console.log('\n7. Framework/Tech stack detection:');
    if (html.includes('nextjs') || html.includes('Next.js')) {
      console.log('   ✓ Next.js detected');
    } else {
      console.log('   ✗ No Next.js mention');
    }

    if (html.includes('_buildManifest') || html.includes('_ssgManifest')) {
      console.log('   ✓ Next.js build artifacts found');
    } else {
      console.log('   ✗ No Next.js build artifacts');
    }

    if (html.includes('React') || html.includes('react')) {
      console.log('   ✓ React mentioned');
    } else {
      console.log('   ✗ No React mention');
    }

    // Save a sample for manual inspection
    const sampleSize = Math.min(5000, html.length);
    const sampleFile = '/tmp/balenciaga_sample.html';
    
    console.log(`\n8. Saving sample to ${sampleFile} for manual inspection...`);

    console.log('\n========== ANALYSIS COMPLETE ==========');
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}

checkBalenciagaHTML();
