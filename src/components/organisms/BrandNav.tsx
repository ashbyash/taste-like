import type { BrandSlug } from '@/types/brand';
import { SOURCE_BRANDS } from '@/types/brand';
import BrandTab from '@/components/molecules/BrandTab';

interface BrandNavProps {
  active: BrandSlug;
  onSelect: (brand: BrandSlug) => void;
}

export default function BrandNav({ active, onSelect }: BrandNavProps) {
  const availableBrands = SOURCE_BRANDS.filter(b => b.available);
  if (availableBrands.length <= 1) return null;

  return (
    <nav aria-label="브랜드 선택">
      <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-[var(--color-border-default)] lg:gap-8">
        {SOURCE_BRANDS.map(brand => (
          <BrandTab
            key={brand.slug}
            label={brand.label}
            active={active === brand.slug}
            disabled={!brand.available}
            onClick={() => onSelect(brand.slug)}
          />
        ))}
      </div>
    </nav>
  );
}
