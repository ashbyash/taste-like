import type { BaseCrawler } from './base';

type CrawlerFactory = () => Promise<BaseCrawler>;

const REGISTRY: Record<string, CrawlerFactory> = {
  zara: async () => {
    const { ZaraCrawler } = await import('./zara');
    return new ZaraCrawler();
  },
  cos: async () => {
    const { CosCrawler } = await import('./cos');
    return new CosCrawler();
  },
  arket: async () => {
    const { ArketCrawler } = await import('./arket');
    return new ArketCrawler();
  },
  uniqlo: async () => {
    const { UniqloCrawler } = await import('./uniqlo');
    return new UniqloCrawler();
  },
};

export async function getCrawler(slug: string): Promise<BaseCrawler> {
  const factory = REGISTRY[slug];
  if (!factory) {
    const available = Object.keys(REGISTRY).join(', ');
    throw new Error(`Unknown crawler: "${slug}". Available: ${available}`);
  }
  return factory();
}

export const ALL_SLUGS = Object.keys(REGISTRY);
