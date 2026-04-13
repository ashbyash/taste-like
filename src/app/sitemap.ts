import type { MetadataRoute } from 'next';
import { STYLE_COMBOS, SEO_CATEGORIES } from '@/lib/seo/config';

const BASE_URL = 'https://taste-like.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  for (const combo of STYLE_COMBOS) {
    entries.push({
      url: `${BASE_URL}/style/${combo.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });

    for (const cat of SEO_CATEGORIES) {
      entries.push({
        url: `${BASE_URL}/style/${combo.slug}/${cat}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
