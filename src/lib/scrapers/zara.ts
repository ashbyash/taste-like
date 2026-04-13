import type { Page, Response } from 'playwright';
import { BaseCrawler, type RawProduct } from './base';
import type { Category, Gender } from '@/types/brand';

// Strict bag keywords for cross-sell detection in non-bag category pages
// Must use full words (e.g. "크로스백" not "크로스") to avoid false positives like "크로스 오버 팬츠"
const CROSS_SELL_BAG_RE = /백팩|토트백|쇼퍼\s*백|숄더\s*백|크로스\s*백|버킷\s*백|클러치|미니\s*백|호보\s*백|핸드백|박스백|쇼퍼/i;

// ZARA category pages — SEO URLs discovered from site navigation
const WOMEN_URLS: [Category, string][] = [
  ['outerwear', 'https://www.zara.com/kr/ko/woman-jackets-l1114.html'],
  ['outerwear', 'https://www.zara.com/kr/ko/woman-blazers-l1055.html'],
  ['tops', 'https://www.zara.com/kr/ko/woman-shirts-l1217.html'],
  ['tops', 'https://www.zara.com/kr/ko/woman-knitwear-l1152.html'],
  ['bottoms', 'https://www.zara.com/kr/ko/woman-trousers-l1119.html'],
  ['bottoms', 'https://www.zara.com/kr/ko/woman-jeans-l1037.html'],
  ['bottoms', 'https://www.zara.com/kr/ko/woman-skirts-l1299.html'],
  ['shoes', 'https://www.zara.com/kr/ko/woman-shoes-l1251.html'],
  ['bags', 'https://www.zara.com/kr/ko/woman-bags-l1024.html'],
  ['accessories', 'https://www.zara.com/kr/ko/woman-accessories-l1177.html'],
];

const MEN_URLS: [Category, string][] = [
  ['outerwear', 'https://www.zara.com/kr/ko/man-jackets-l640.html'],
  ['outerwear', 'https://www.zara.com/kr/ko/man-blazers-l608.html'],
  ['tops', 'https://www.zara.com/kr/ko/man-shirts-l737.html'],
  ['tops', 'https://www.zara.com/kr/ko/man-knitwear-l681.html'],
  ['bottoms', 'https://www.zara.com/kr/ko/man-trousers-l838.html'],
  ['bottoms', 'https://www.zara.com/kr/ko/man-jeans-l659.html'],
  ['shoes', 'https://www.zara.com/kr/ko/man-shoes-l769.html'],
  ['bags', 'https://www.zara.com/kr/ko/man-bags-l563.html'],
  ['accessories', 'https://www.zara.com/kr/ko/man-accessories-l537.html'],
];

interface ZaraProduct {
  id: number;
  type: string;
  name: string;
  price: number;
  reference: string;
  detail?: {
    colors?: Array<{
      xmedia?: Array<{
        extraInfo?: {
          deliveryUrl?: string;
        };
      }>;
    }>;
  };
}

export class ZaraCrawler extends BaseCrawler {
  readonly brand = 'ZARA';
  readonly brandTier = 'spa' as const;
  readonly baseUrl = 'https://www.zara.com/kr/ko';
  private pendingApiResponse: Promise<string | null> | null = null;

  getCategoryUrls(gender: Gender): [Category, string][] {
    return gender === 'men' ? MEN_URLS : WOMEN_URLS;
  }

  protected async navigateTo(page: Page, url: string): Promise<void> {
    // ZARA's SPA hijacks subsequent navigations on the same page.
    // Create a fresh page per category by closing old and opening new.
    // The browser context preserves session cookies across pages.
    const newPage = await this.context.newPage();

    // Set up API listener BEFORE navigation
    this.pendingApiResponse = newPage.waitForResponse(
      (response: Response) => response.url().includes('/products?ajax=true'),
      { timeout: 20_000 },
    ).then(r => r.text()).catch(() => null);

    await newPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });

    // Swap: copy newPage's content/state into the tracked page reference.
    // We can't replace the page object, so we store the active page.
    this._activePage = newPage;
  }

  async extractProducts(_page: Page, category: Category, gender: Gender): Promise<RawProduct[]> {
    const page = this._activePage ?? _page;

    await this.delay(2000, 3000);
    const apiData = this.pendingApiResponse ? await this.pendingApiResponse : null;
    this.pendingApiResponse = null;

    let products: RawProduct[];
    if (!apiData) {
      console.warn('  [ZARA] No API response captured, falling back to DOM');
      products = await this.extractFromDom(page, category, gender);
    } else {
      products = this.parseApiResponse(apiData, category, gender);
    }

    // Close the per-category page after extraction
    if (this._activePage && this._activePage !== _page) {
      await this._activePage.close();
      this._activePage = null;
    }

    return products;
  }

  private _activePage: Page | null = null;

  private parseApiResponse(json: string, category: Category, gender: Gender): RawProduct[] {
    const data = JSON.parse(json);
    const products: RawProduct[] = [];

    const groups = data.productGroups ?? [];
    for (const group of groups) {
      const elements = group.elements ?? [];
      for (const element of elements) {
        const components = element.commercialComponents ?? [];
        for (const comp of components as ZaraProduct[]) {
          if (comp.type !== 'Product') continue;

          const imageUrl = this.extractImageUrl(comp);
          if (!comp.name || !comp.price || !imageUrl) continue;

          // Skip cross-sell bags appearing on non-bag category pages
          if (category !== 'bags' && CROSS_SELL_BAG_RE.test(comp.name)) {
            console.warn(`  [ZARA] Skipping cross-sell bag: ${comp.name}`);
            continue;
          }

          const refId = comp.reference?.split('-')[0] ?? String(comp.id);
          products.push({
            name: comp.name,
            price: comp.price,
            currency: 'KRW',
            category,
            gender,
            image_url: imageUrl,
            product_url: `https://www.zara.com/kr/ko/-p${refId}.html`,
          });
        }
      }
    }

    return products;
  }

  private extractImageUrl(product: ZaraProduct): string | null {
    const colors = product.detail?.colors ?? [];
    for (const color of colors) {
      for (const media of color.xmedia ?? []) {
        const url = media.extraInfo?.deliveryUrl;
        if (url) return url.startsWith('http') ? url : `https://static.zara.net${url}`;
      }
    }
    return null;
  }

  private async extractFromDom(page: Page, category: Category, gender: Gender): Promise<RawProduct[]> {
    await this.scrollToLoadAll(page, '.product-grid-product');

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-grid-product');
      return Array.from(cards).map(card => {
        const nameEl = card.querySelector('.product-grid-product-info__name h3');
        const linkEl = card.querySelector('a.product-link') as HTMLAnchorElement | null;
        const imgEl = card.querySelector('.media-image__image') as HTMLImageElement | null;
        return {
          name: nameEl?.textContent?.trim() ?? '',
          href: linkEl?.href ?? '',
          imageSrc: imgEl?.src ?? '',
        };
      });
    });

    return items
      .filter(i => i.name && i.href && i.imageSrc)
      .map(i => ({
        name: i.name,
        price: 0,
        currency: 'KRW',
        category,
        gender,
        image_url: i.imageSrc,
        product_url: i.href,
      }));
  }
}
