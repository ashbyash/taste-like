import ProductImage from '@/components/atoms/ProductImage';
import { formatPrice } from '@/lib/format';

interface SourceCardProps {
  product: {
    name: string;
    brand: string;
    price: number;
    imageUrl: string;
    productUrl: string;
  };
  className?: string;
}

export default function SourceCard({ product, className = '' }: SourceCardProps) {
  return (
    <a
      href={product.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-page)] p-5 transition-colors hover:border-[var(--color-text-secondary)] ${className}`}
    >
      <div className="w-24 shrink-0 sm:w-28">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          width={160}
          height={213}
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] tracking-wider text-[var(--color-text-secondary)]">
          원본 상품
        </span>
        <h2 className="text-heading mt-1 leading-snug">{product.name}</h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{product.brand}</p>
        <p className="mt-2 text-body font-semibold">{formatPrice(product.price)}</p>
      </div>
    </a>
  );
}
