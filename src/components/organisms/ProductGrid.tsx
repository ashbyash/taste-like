import type { Product, RecommendedItem } from '@/types/product';
import ProductCard from '@/components/molecules/ProductCard';
import Skeleton from '@/components/atoms/Skeleton';
import EmptyState from '@/components/molecules/EmptyState';

interface ProductGridProps {
  variant: 'browse' | 'recommend';
  products: (Product | RecommendedItem)[];
  onProductClick?: (id: string) => void;
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
}

export default function ProductGrid({
  variant,
  products,
  onProductClick,
  loading = false,
  skeletonCount = 8,
  className = '',
}: ProductGridProps) {
  const gridCols = variant === 'browse'
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
    : 'grid-cols-2 lg:grid-cols-3';

  if (loading) {
    return (
      <div className={`grid ${gridCols} gap-3 sm:gap-6 ${className}`}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState variant="no-results" />;
  }

  return (
    <div className={`grid ${gridCols} gap-3 sm:gap-6 ${className}`}>
      {products.map(product => {
        const isRecommend = variant === 'recommend' && 'similarity' in product;
        return (
          <ProductCard
            key={product.id}
            variant={variant}
            product={{
              name: product.name,
              brand: product.brand,
              price: product.price,
              imageUrl: product.image_url,
              productUrl: product.product_url,
              category: product.category,
            }}
            savings={isRecommend ? (product as RecommendedItem).savings_percent : undefined}
            similarity={isRecommend ? Math.round((product as RecommendedItem).similarity * 100) : undefined}
            onClick={variant === 'browse' ? () => onProductClick?.(product.id) : undefined}
          />
        );
      })}
    </div>
  );
}
