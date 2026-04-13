import type { Page } from 'playwright';
import { BaseCrawler, type RawProduct } from './base';
import type { Category, Gender } from '@/types/brand';

// ARKET KR category URLs (더현대닷컴 운영)
const WOMEN_URLS: [Category, string][] = [
  ['tops', 'https://www.arket.com/ko-kr/women/tops.html'],
  ['bottoms', 'https://www.arket.com/ko-kr/women/Trousers.html'],
  ['bottoms', 'https://www.arket.com/ko-kr/women/skirts.html'],
  ['bottoms', 'https://www.arket.com/ko-kr/women/dresses.html'],
  ['shoes', 'https://www.arket.com/ko-kr/women/shoes.html'],
  ['bags', 'https://www.arket.com/ko-kr/women/bags-and-accessories/bags.html'],
];

const MEN_URLS: [Category, string][] = [
  ['tops', 'https://www.arket.com/ko-kr/men/shirts.html'],
  ['tops', 'https://www.arket.com/ko-kr/men/T-shirts.html'],
  ['tops', 'https://www.arket.com/ko-kr/men/sweatshirts-and-hoodies.html'],
  ['bottoms', 'https://www.arket.com/ko-kr/men/trousers.html'],
  ['shoes', 'https://www.arket.com/ko-kr/men/shoes.html'],
  ['bags', 'https://www.arket.com/ko-kr/men/bags/bags-all.html'],
];

export class ArketCrawler extends BaseCrawler {
  readonly brand = 'ARKET';
  readonly brandTier = 'spa' as const;
  readonly baseUrl = 'https://www.arket.com/ko-kr';
  private _activePage: Page | null = null;

  getCategoryUrls(gender: Gender): [Category, string][] {
    return gender === 'men' ? MEN_URLS : WOMEN_URLS;
  }

  protected async navigateTo(page: Page, url: string): Promise<void> {
    // Same TheHyundai SPA as COS — use fresh page per category
    const newPage = await this.context.newPage();
    await newPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await newPage.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
    await newPage.waitForSelector('[class*="ProdCard_card"]', { timeout: 10_000 }).catch(() => {});
    await this.delay(1000, 2000);
    this._activePage = newPage;
  }

  async extractProducts(_page: Page, category: Category, gender: Gender): Promise<RawProduct[]> {
    const page = this._activePage ?? _page;

    // ARKET uses scroll-based lazy loading
    await this.scrollToLoadAll(page, '[class*="ProdCard_card"]');

    // ARKET KR uses the same TheHyundai React platform as COS
    const items = await page.evaluate(() => {
      // Find product list container — try multiple strategies
      const prodRoot = document.querySelector('[class*="ProdCard_root"]');
      const prodList = document.querySelector('[class*="ProdCard_list"]');
      const candidates = [prodRoot?.parentElement, prodList, prodRoot].filter(Boolean) as Element[];

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
              productUrl: p.globalUrl || p.href || '',
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
        const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const linkEl = card.querySelector('a[href]') as HTMLAnchorElement | null;
        const href = linkEl?.getAttribute('href') || '';
        return {
          name: nameEl?.textContent?.trim() || '',
          price: parseInt(priceEl?.textContent?.replace(/[^0-9]/g, '') || '0', 10),
          imageUrl: imgEl?.src || '',
          productUrl: href.includes('product.') ? href.split('?')[0] : '',
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
      .map(i => {
        const cleanUrl = i.productUrl.split('?')[0];
        const productUrl = cleanUrl.startsWith('http')
          ? cleanUrl
          : `https://www.arket.com/ko-kr${cleanUrl}`;

        return {
          name: i.name,
          price: i.price,
          currency: 'KRW',
          category,
          gender,
          image_url: i.imageUrl,
          product_url: productUrl,
        } satisfies RawProduct;
      });
  }
}
