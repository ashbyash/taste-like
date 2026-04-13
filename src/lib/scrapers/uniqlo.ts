import type { Page } from 'playwright';
import { BaseCrawler, type RawProduct } from './base';
import type { Category, Gender } from '@/types/brand';

// Uniqlo KR category URLs
// tops = 티셔츠/스웨트 + 니트/가디건 + 셔츠/블라우스
// bottoms = 팬츠 + 원피스/스커트
const WOMEN_URLS: [Category, string][] = [
  ['outerwear', 'https://www.uniqlo.com/kr/ko/women/outerwear'],
  ['tops', 'https://www.uniqlo.com/kr/ko/women/tops'],
  ['tops', 'https://www.uniqlo.com/kr/ko/women/sweaters-and-knitwear'],
  ['tops', 'https://www.uniqlo.com/kr/ko/women/shirts-and-blouses'],
  ['bottoms', 'https://www.uniqlo.com/kr/ko/women/bottoms'],
  ['bottoms', 'https://www.uniqlo.com/kr/ko/women/dress-and-skirts'],
];

const MEN_URLS: [Category, string][] = [
  ['outerwear', 'https://www.uniqlo.com/kr/ko/men/outerwear'],
  ['tops', 'https://www.uniqlo.com/kr/ko/men/tops'],
  ['tops', 'https://www.uniqlo.com/kr/ko/men/sweaters-and-knitwear'],
  ['tops', 'https://www.uniqlo.com/kr/ko/men/shirts-and-polo-shirts'],
  ['bottoms', 'https://www.uniqlo.com/kr/ko/men/bottoms'],
];

export class UniqloCrawler extends BaseCrawler {
  readonly brand = 'UNIQLO';
  readonly brandTier = 'spa' as const;
  readonly baseUrl = 'https://www.uniqlo.com/kr/ko';

  getCategoryUrls(gender: Gender): [Category, string][] {
    return gender === 'men' ? MEN_URLS : WOMEN_URLS;
  }

  protected async navigateTo(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    // Wait for full load (Akamai JS challenge + React hydration)
    await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
    await this.delay(2000, 3000);
  }

  async extractProducts(page: Page, category: Category, gender: Gender): Promise<RawProduct[]> {
    // Scroll to load all products (SSR renders first 36, rest via lazy loading)
    await this.scrollToLoadAll(page, 'a.product-tile__link', { maxScrolls: 30 });

    const items = await page.evaluate(() => {
      const links = document.querySelectorAll('a.product-tile__link');
      return Array.from(links).map(a => {
        const tile = a.querySelector('.product-tile');
        if (!tile) return null;

        const contentArea = tile.querySelector('.product-tile__content-area');
        if (!contentArea) return null;

        const nameEl = contentArea.querySelector('h2[data-testid="ITOTypography"]');
        const priceEl = contentArea.querySelector('[data-testid="ITOContentAlignment"] [data-testid="ITOTypography"]');
        const img = tile.querySelector('img') as HTMLImageElement | null;

        const name = nameEl?.textContent?.trim() ?? '';
        const priceText = priceEl?.textContent?.trim() ?? '';
        const price = priceText.replace(/[^0-9]/g, '');

        return {
          name,
          price,
          imageSrc: img?.src ?? '',
          href: (a as HTMLAnchorElement).href ?? '',
        };
      });
    });

    return items
      .filter((i): i is NonNullable<typeof i> =>
        i !== null && i.name !== '' && i.price !== '' && i.imageSrc !== ''
      )
      .map(i => {
        // Strip colorDisplayCode query param for deduplication
        const url = new URL(i.href);
        url.searchParams.delete('colorDisplayCode');
        const productUrl = url.toString();

        return {
          name: i.name,
          price: parseInt(i.price, 10),
          currency: 'KRW',
          category,
          gender,
          image_url: i.imageSrc,
          product_url: productUrl,
        } satisfies RawProduct;
      });
  }
}
