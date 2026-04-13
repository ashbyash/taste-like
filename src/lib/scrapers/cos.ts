import type { Page } from 'playwright';
import { BaseCrawler, type RawProduct } from './base';
import type { Category, Gender } from '@/types/brand';

// COS KR category URLs — discovered from site navigation
const WOMEN_URLS: [Category, string][] = [
  ['outerwear', 'https://www.cos.com/ko-kr/women/coats-jackets.html'],
  ['tops', 'https://www.cos.com/ko-kr/women/tops.html'],
  ['tops', 'https://www.cos.com/ko-kr/women/knitwear.html'],
  ['bottoms', 'https://www.cos.com/ko-kr/women/trousers.html'],
  ['bottoms', 'https://www.cos.com/ko-kr/women/skirts.html'],
  ['bottoms', 'https://www.cos.com/ko-kr/women/dresses.html'],
  ['shoes', 'https://www.cos.com/ko-kr/women/shoes.html'],
  ['bags', 'https://www.cos.com/ko-kr/women/bags-purses.html'],
  ['accessories', 'https://www.cos.com/ko-kr/women/jewellery.html'],
  ['accessories', 'https://www.cos.com/ko-kr/women/hats-scarves-gloves.html'],
  ['accessories', 'https://www.cos.com/ko-kr/women/belts.html'],
];

const MEN_URLS: [Category, string][] = [
  ['outerwear', 'https://www.cos.com/ko-kr/men/coats-jackets.html'],
  ['tops', 'https://www.cos.com/ko-kr/men/shirts.html'],
  ['tops', 'https://www.cos.com/ko-kr/men/t-shirts.html'],
  ['tops', 'https://www.cos.com/ko-kr/men/knitwear.html'],
  ['bottoms', 'https://www.cos.com/ko-kr/men/trousers.html'],
  ['bottoms', 'https://www.cos.com/ko-kr/men/jeans.html'],
  ['shoes', 'https://www.cos.com/ko-kr/men/shoes.html'],
  ['bags', 'https://www.cos.com/ko-kr/men/bags-wallets.html'],
];

export class CosCrawler extends BaseCrawler {
  readonly brand = 'COS';
  readonly brandTier = 'spa' as const;
  readonly baseUrl = 'https://www.cos.com/ko-kr';
  private _activePage: Page | null = null;

  getCategoryUrls(gender: Gender): [Category, string][] {
    return gender === 'men' ? MEN_URLS : WOMEN_URLS;
  }

  protected async navigateTo(page: Page, url: string): Promise<void> {
    // COS KR is a SPA — state bleeds between navigations on the same page.
    // Use a fresh page per category to avoid data contamination.
    const newPage = await this.context.newPage();
    await newPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await newPage.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
    await newPage.waitForSelector('[class*="ProdCard_card"]', { timeout: 10_000 }).catch(() => {});
    this._activePage = newPage;
  }

  async extractProducts(_page: Page, category: Category, gender: Gender): Promise<RawProduct[]> {
    const page = this._activePage ?? _page;

    await this.clickLoadMoreUntilDone(page);

    // COS KR uses a React app with ProdCard components (TheHyundai platform)
    // Extract product data from React fiber tree for reliability
    const items = await page.evaluate(() => {
      // Try multiple container candidates — fiber attachment point varies
      const prodRoot = document.querySelector('[class*="ProdCard_root"]');
      const prodList = document.querySelector('[class*="ProdCard_list"]');
      const candidates = [prodList, prodRoot?.parentElement, prodRoot].filter(Boolean) as Element[];

      for (const el of candidates) {
        const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
        if (!fiberKey) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fiber = (el as any)[fiberKey];
        const visited = new Set();

        while (fiber && !visited.has(fiber)) {
          visited.add(fiber);
          const props = fiber.memoizedProps || {};
          if (Array.isArray(props.data) && props.data.length > 0 && props.data[0].slitmNm) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return props.data.map((p: any) => ({
              name: p.slitmNm || '',
              price: p.sellPrc || 0,
              imageUrl: p.image?.src || (p.listMainImg ? `https://image.thehyundai.com/${p.listMainImg}` : ''),
              productUrl: p.globalUrl || '',
            }));
          }
          fiber = fiber.return;
          if (visited.size > 50) break;
        }
      }

      // Fallback: extract from DOM with partial class matching
      const cards = document.querySelectorAll('[class*="ProdCard_card"]');
      return Array.from(cards).map(card => {
        const nameEl = card.querySelector('[class*="ProdCard_name"]');
        const priceEl = card.querySelector('[class*="ProdCard_price"], [class*="price"]');
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const linkEl = card.querySelector('a[href]') as HTMLAnchorElement | null;
        const href = linkEl?.getAttribute('href') || '';
        // COS uses javascript:$WG_StartWebGate('228', '/ko-kr/...') — extract URL
        const urlMatch = href.match(/['"]([^'"]*product\.[^'"]+)['"]/);
        return {
          name: nameEl?.textContent?.trim() || '',
          price: parseInt(priceEl?.textContent?.replace(/[^0-9]/g, '') || '0', 10),
          imageUrl: imgEl?.src || '',
          productUrl: urlMatch?.[1] || '',
        };
      });
    });

    // Close the per-category page after extraction
    if (this._activePage && this._activePage !== _page) {
      await this._activePage.close();
      this._activePage = null;
    }

    return (items as { name: string; price: number; imageUrl: string; productUrl: string }[])
      .filter(i => i.name && i.price && i.imageUrl && i.productUrl)
      .map(i => ({
        name: i.name,
        price: i.price,
        currency: 'KRW',
        category,
        gender,
        image_url: i.imageUrl,
        product_url: i.productUrl.startsWith('http')
          ? i.productUrl.split('?')[0]
          : `https://www.cos.com/ko-kr${i.productUrl}`.split('?')[0],
      } satisfies RawProduct));
  }

  private async clickLoadMoreUntilDone(page: Page, maxClicks = 10): Promise<void> {
    for (let i = 0; i < maxClicks; i++) {
      const btn = page.locator('[class*="LoadMoreButton_button"]').first();
      const isVisible = await btn.isVisible().catch(() => false);
      if (!isVisible) break;

      // COS uses the same button class for "Load More Products (36/134)"
      // and "NEXT CATEGORY: ..." — only click genuine load-more buttons
      const text = await btn.textContent().catch(() => '') ?? '';
      if (text.includes('NEXT CATEGORY') || text.includes('NEXT')) break;

      await btn.click();
      await this.delay(1500, 2500);
    }
  }
}
