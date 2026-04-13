import type { ScrapedProduct, RecommendedItem } from '@/types/product';
import SourceCard from '@/components/molecules/SourceCard';
import ProductGrid from '@/components/organisms/ProductGrid';

interface RecommendSectionProps {
  source: ScrapedProduct;
  recommendations: RecommendedItem[];
  className?: string;
}

export default function RecommendSection({
  source,
  recommendations,
  className = '',
}: RecommendSectionProps) {
  return (
    <div className={`space-y-6 sm:space-y-8 ${className}`} style={{ animation: 'fadeIn 200ms ease-out' }}>
      <section>
        <SourceCard
          product={{
            name: source.name,
            brand: source.brand,
            price: source.price,
            imageUrl: source.image_url,
            productUrl: source.product_url,
          }}
        />
      </section>
      <section>
        <div className="mb-5 flex items-baseline gap-2">
          <h2 className="text-base font-semibold">추천 대안</h2>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {recommendations.length}개의 대안을 찾았어요
          </span>
        </div>
        {recommendations.length === 0 ? (
          <p className="py-8 text-center text-[var(--color-text-secondary)]">
            유사한 상품을 찾지 못했습니다
          </p>
        ) : (
          <ProductGrid variant="recommend" products={recommendations} />
        )}
      </section>
    </div>
  );
}
