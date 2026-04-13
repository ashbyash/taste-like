import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { findCombo, SEO_CATEGORIES, getCategoryLabelKo } from '@/lib/seo/config';
import { getStylePairs } from '@/lib/supabase/queries-seo';
import type { Category } from '@/types/brand';
import CategoryNav from '@/components/seo/CategoryNav';
import BrandFilterGrid from '@/components/seo/BrandFilterGrid';
import CtaBanner from '@/components/seo/CtaBanner';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 86400; // 24h ISR

export async function generateMetadata({
  params,
}: {
  params: Promise<{ combo: string; category: string }>;
}): Promise<Metadata> {
  const { combo, category } = await params;
  const config = findCombo(combo);
  if (!config) return {};

  const catLabel = getCategoryLabelKo(category);
  const title = `${config.titleKo} ${catLabel}`;
  const description = `AI 비주얼 유사도 분석 기반 럭셔리 아이템 대안 추천`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ko_KR',
    },
    alternates: {
      canonical: `https://taste-like.vercel.app/style/${combo}/${category}`,
    },
  };
}

export default async function StyleCategoryPage({
  params,
}: {
  params: Promise<{ combo: string; category: string }>;
}) {
  const { combo, category } = await params;
  const config = findCombo(combo);

  if (!config || !SEO_CATEGORIES.includes(category as Category)) {
    notFound();
  }

  const pairs = await getStylePairs({
    spaBrand: config.spaBrand,
    category: category as Category,
    limit: 20,
  });

  const catLabel = getCategoryLabelKo(category);
  const pageUrl = `https://taste-like.vercel.app/style/${combo}/${category}`;

  return (
    <>
      <JsonLd
        title={`${config.titleKo} ${catLabel}`}
        description={`${config.spaBrandKo}에서 찾는 럭셔리 브랜드 ${catLabel}`}
        url={pageUrl}
        pairs={pairs}
      />

      {/* Breadcrumb update for category */}
      <nav className="mb-6 -mt-6 text-sm text-base-content/50">
        <Link href="/" className="hover:text-base-content/80">홈</Link>
        <span className="mx-1.5">›</span>
        <Link
          href={`/style/${combo}`}
          className="hover:text-base-content/80"
        >
          {config.titleKo}
        </Link>
        <span className="mx-1.5">›</span>
        <span>{catLabel}</span>
      </nav>

      {/* Hero */}
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {config.titleKo}
        </h1>
        <p className="mt-2 text-sm text-base-content/60">
          {config.spaBrandKo}에서 찾는 럭셔리 브랜드 {catLabel}
        </p>
      </header>

      {/* Category Nav */}
      <div className="mb-8">
        <CategoryNav comboSlug={combo} activeCategory={category} />
      </div>

      {/* Product pairs with luxury brand filter */}
      <BrandFilterGrid pairs={pairs} />

      {/* CTA */}
      <div className="mt-10">
        <CtaBanner />
      </div>
    </>
  );
}
