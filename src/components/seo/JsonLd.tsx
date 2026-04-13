import type { StylePair } from '@/lib/supabase/queries-seo';

interface Props {
  title: string;
  description: string;
  url: string;
  pairs: StylePair[];
}

export default function JsonLd({ title, description, url, pairs }: Props) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description,
    url,
    numberOfItems: pairs.length,
    itemListElement: pairs.map((pair, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: pair.spa.name,
        brand: { '@type': 'Brand', name: pair.spa.brand },
        image: pair.spa.image_url,
        url: pair.spa.product_url,
        offers: {
          '@type': 'Offer',
          price: pair.spa.price,
          priceCurrency: 'KRW',
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  };

  // Safe: JSON.stringify of our own DB data, no user input
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
