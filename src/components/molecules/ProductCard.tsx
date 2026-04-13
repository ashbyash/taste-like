import ProductImage from '@/components/atoms/ProductImage';
import Badge from '@/components/atoms/Badge';
import { formatPrice } from '@/lib/format';
import { trackEvent } from '@/lib/analytics';

interface ProductCardProps {
  variant: 'browse' | 'recommend';
  product: {
    name: string;
    brand: string;
    price: number;
    imageUrl: string;
    productUrl: string;
    category?: string;
  };
  savings?: number;
  similarity?: number;
  onClick?: () => void;
  className?: string;
}

export default function ProductCard({
  variant,
  product,
  savings,
  similarity,
  onClick,
  className = '',
}: ProductCardProps) {
  function handleRecommendClick() {
    trackEvent({
      action: 'click_recommendation',
      params: {
        product_name: product.name,
        brand: product.brand,
        category: product.category ?? '',
        price: product.price,
        similarity: similarity ?? 0,
      },
    });
  }

  const content = (
    <>
      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        className="transition-opacity group-hover:opacity-90"
      />
      <div className="mt-2.5">
        <span className="text-label tracking-wider text-[var(--color-text-secondary)]">
          {product.brand}
        </span>
        <h3 className="mt-0.5 text-sm font-medium leading-snug text-[var(--color-text-primary)] line-clamp-2">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-body font-semibold">
            {formatPrice(product.price)}
          </span>
          {variant === 'recommend' && savings != null && (
            <Badge variant="savings">-{savings}%</Badge>
          )}
        </div>
        {variant === 'recommend' && similarity != null && similarity > 0 && (
          <p className="mt-1 text-xs text-[var(--color-accent-similarity)]">
            유사도 {similarity}%
          </p>
        )}
      </div>
    </>
  );

  if (variant === 'recommend') {
    return (
      <a
        href={product.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleRecommendClick}
        className={`group ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={`group text-left ${className}`}>
      {content}
    </button>
  );
}
