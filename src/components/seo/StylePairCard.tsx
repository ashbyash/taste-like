import Image from 'next/image';
import type { StylePair } from '@/lib/supabase/queries-seo';

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

function savingsPercent(luxuryPrice: number, spaPrice: number): number {
  if (luxuryPrice <= 0) return 0;
  return Math.round(((luxuryPrice - spaPrice) / luxuryPrice) * 100);
}

interface Props {
  pair: StylePair;
}

export default function StylePairCard({ pair }: Props) {
  const { spa, luxury } = pair;
  const savings = savingsPercent(luxury.price, spa.price);
  const similarityPct = Math.round(luxury.similarity * 100);

  return (
    <div className="rounded-lg border border-base-300">
      {/* Image pair: side by side on sm+, stacked on mobile */}
      <div className="grid grid-cols-2 gap-0">
        {/* SPA product */}
        <a
          href={spa.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <figure className="aspect-[3/4] overflow-hidden">
            <Image
              src={spa.image_url}
              alt={spa.name}
              width={360}
              height={480}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </figure>
        </a>

        {/* Luxury match */}
        <a
          href={luxury.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group border-l border-base-300"
        >
          <figure className="aspect-[3/4] overflow-hidden">
            <Image
              src={luxury.image_url}
              alt={luxury.name}
              width={360}
              height={480}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </figure>
        </a>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-0 border-t border-base-300">
        {/* SPA info */}
        <div className="p-2 sm:p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary sm:text-xs">
            {spa.brand}
          </p>
          <h3 className="mt-0.5 text-xs leading-snug line-clamp-2 sm:text-sm">
            {spa.name}
          </h3>
          <p className="mt-1 text-sm font-bold sm:text-base">
            {formatPrice(spa.price)}
          </p>
        </div>

        {/* Luxury info */}
        <div className="border-l border-base-300 p-2 sm:p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary sm:text-xs">
            {luxury.brand}
          </p>
          <h3 className="mt-0.5 text-xs leading-snug text-base-content/60 line-clamp-2 sm:text-sm">
            {luxury.name}
          </h3>
          <p className="mt-1 text-sm text-secondary line-through sm:text-base">
            {formatPrice(luxury.price)}
          </p>
        </div>
      </div>

      {/* Badge bar */}
      <div className="flex items-center justify-center gap-3 border-t border-base-300 px-3 py-2">
        <span className="text-xs font-semibold text-accent">
          {savings}% 저렴
        </span>
        <span className="text-xs text-secondary">
          유사도 {similarityPct}%
        </span>
      </div>
    </div>
  );
}
