import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findCombo, SEO_CATEGORIES, getCategoryLabelKo } from '@/lib/seo/config';
import { getStylePairs } from '@/lib/supabase/queries-seo';
import StylePairCard from '@/components/seo/StylePairCard';
import CategoryNav from '@/components/seo/CategoryNav';
import CtaBanner from '@/components/seo/CtaBanner';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 86400; // 24h ISR

export async function generateMetadata({
  params,
}: {
  params: Promise<{ combo: string }>;
}): Promise<Metadata> {
  const { combo } = await params;
  const config = findCombo(combo);
  if (!config) return {};

  return {
    title: config.titleKo,
    description: config.descKo,
    openGraph: {
      title: config.titleKo,
      description: config.descKo,
      type: 'website',
      locale: 'ko_KR',
    },
    alternates: {
      canonical: `https://taste-like.vercel.app/style/${combo}`,
    },
  };
}

export default async function StyleIndexPage({
  params,
}: {
  params: Promise<{ combo: string }>;
}) {
  const { combo } = await params;
  const config = findCombo(combo);
  if (!config) notFound();

  // Fetch top 4 pairs per category for the index page
  const categoryPairs = await Promise.all(
    SEO_CATEGORIES.map(async (cat) => {
      const pairs = await getStylePairs({
        spaBrand: config.spaBrand,
        category: cat,
        limit: 4,
      });
      return { category: cat, pairs };
    }),
  );

  const allPairs = categoryPairs.flatMap((cp) => cp.pairs);
  const pageUrl = `https://taste-like.vercel.app/style/${combo}`;

  return (
    <>
      <JsonLd
        title={config.titleKo}
        description={config.descKo}
        url={pageUrl}
        pairs={allPairs}
      />

      {/* Hero */}
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {config.titleKo}
        </h1>
        <p className="mt-2 text-sm text-base-content/60">
          AI 비주얼 유사도 분석으로 찾은 명품 스타일 대안
        </p>
      </header>

      {/* Category Nav */}
      <div className="mb-8">
        <CategoryNav comboSlug={combo} />
      </div>

      {/* Category sections */}
      {categoryPairs.map(({ category, pairs }) =>
        pairs.length > 0 ? (
          <section key={category} className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {getCategoryLabelKo(category)}
              </h2>
              <a
                href={`/style/${combo}/${category}`}
                className="text-sm text-secondary hover:underline"
              >
                더보기 →
              </a>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {pairs.map((pair) => (
                <StylePairCard key={pair.spa.id} pair={pair} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      {/* CTA */}
      <div className="mt-8">
        <CtaBanner />
      </div>
    </>
  );
}
