'use client';

import { useState, useMemo } from 'react';
import type { StylePair } from '@/lib/supabase/queries-seo';
import StylePairCard from './StylePairCard';

interface Props {
  pairs: StylePair[];
}

export default function BrandFilterGrid({ pairs }: Props) {
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const luxuryBrands = useMemo(() => {
    const brands = new Map<string, number>();
    for (const pair of pairs) {
      brands.set(pair.luxury.brand, (brands.get(pair.luxury.brand) ?? 0) + 1);
    }
    // Sort by count descending
    return [...brands.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([brand]) => brand);
  }, [pairs]);

  const filtered = activeBrand
    ? pairs.filter((p) => p.luxury.brand === activeBrand)
    : pairs;

  // Don't render filter if only one brand
  const showFilter = luxuryBrands.length > 1;

  return (
    <>
      {showFilter && (
        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
          <button
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              !activeBrand
                ? 'border-primary bg-primary text-primary-content'
                : 'border-base-300 text-info hover:border-secondary hover:text-base-content'
            }`}
            onClick={() => setActiveBrand(null)}
          >
            전체
          </button>
          {luxuryBrands.map((brand) => (
            <button
              key={brand}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                activeBrand === brand
                  ? 'border-primary bg-primary text-primary-content'
                  : 'border-base-300 text-info hover:border-secondary hover:text-base-content'
              }`}
              onClick={() => setActiveBrand(brand)}
            >
              {brand}
            </button>
          ))}
        </nav>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((pair) => (
            <StylePairCard key={pair.spa.id} pair={pair} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-secondary">
          이 브랜드에는 아직 매칭된 상품이 없습니다
        </p>
      )}
    </>
  );
}
