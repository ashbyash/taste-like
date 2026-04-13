# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a design token system and restructure existing 9 components into an Atomic Design hierarchy (atoms/molecules/organisms) with markdown documentation.

**Architecture:** Extract semantic color/typography/spacing tokens in globals.css on top of existing DaisyUI "taste" theme. Reorganize components into atoms → molecules → organisms folders with strict one-way dependency. Each component follows a shared contract (Props interface, variant prop, className pass-through, semantic tokens only).

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, DaisyUI v5.5, React 19

**Spec:** `docs/specs/2026-04-12-design-system.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/format.ts` | Shared `formatPrice()` utility (extracted from 3 duplicates) |
| `src/components/atoms/Badge.tsx` | Savings %, category tag, similarity % display |
| `src/components/atoms/Button.tsx` | Primary, ghost, pill button variants |
| `src/components/atoms/Input.tsx` | URL text input |
| `src/components/atoms/ProductImage.tsx` | Next.js Image wrapper with proxy, aspect ratio, fallback |
| `src/components/atoms/Skeleton.tsx` | Loading placeholders (card, text, image) |
| `src/components/atoms/Typography.tsx` | display/heading/body/caption/label text |
| `src/components/molecules/ProductCard.tsx` | Browse & recommend product card |
| `src/components/molecules/SourceCard.tsx` | Horizontal source product banner |
| `src/components/molecules/SearchBar.tsx` | URL input + submit button |
| `src/components/molecules/BrandTab.tsx` | Single brand nav item |
| `src/components/molecules/GenderTab.tsx` | Single gender toggle item |
| `src/components/molecules/CategoryPill.tsx` | Single category filter button |
| `src/components/molecules/EmptyState.tsx` | Coming soon / no results / error states |
| `src/components/organisms/BrandNav.tsx` | Brand tab row |
| `src/components/organisms/CategoryFilter.tsx` | Category pill row |
| `src/components/organisms/GenderToggle.tsx` | Gender tab pair |
| `src/components/organisms/ProductGrid.tsx` | Product card grid with skeleton loading |
| `src/components/organisms/RecommendSection.tsx` | Source card + recommendation grid |
| `src/components/organisms/LoadingOverlay.tsx` | Multi-step loading spinner |
| `src/components/index.ts` | Barrel re-export |
| `docs/design-system/README.md` | Design system overview |
| `docs/design-system/tokens.md` | Token reference |
| `docs/design-system/atoms.md` | Atom component docs |
| `docs/design-system/molecules.md` | Molecule component docs |
| `docs/design-system/organisms.md` | Organism component docs |
| `docs/design-system/patterns.md` | Shared UX patterns |

### Modified Files

| File | Change |
|------|--------|
| `src/app/globals.css` | Add semantic tokens + @utility typography classes |
| `src/app/page.tsx` | Update imports to use barrel export, use new organisms |

### Deleted Files

| File | Replaced By |
|------|-------------|
| `src/components/RecommendCard.tsx` | `molecules/ProductCard.tsx` |
| `src/components/SourceCard.tsx` | `molecules/SourceCard.tsx` |
| `src/components/UrlSearchBar.tsx` | `molecules/SearchBar.tsx` |
| `src/components/BrandNav.tsx` | `organisms/BrandNav.tsx` |
| `src/components/CategoryFilter.tsx` | `organisms/CategoryFilter.tsx` |
| `src/components/GenderToggle.tsx` | `organisms/GenderToggle.tsx` |
| `src/components/SourceProductGrid.tsx` | `organisms/ProductGrid.tsx` |
| `src/components/LoadingProgress.tsx` | `organisms/LoadingOverlay.tsx` |
| `src/components/BrandComingSoon.tsx` | `molecules/EmptyState.tsx` |

---

### Task 1: Design Tokens

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/format.ts`

- [ ] **Step 1: Add semantic color tokens and typography utilities to globals.css**

Append after the existing DaisyUI theme block:

```css
/* ── Semantic Color Tokens ── */
:root {
  --color-text-primary: var(--color-base-content);
  --color-text-secondary: var(--color-secondary);
  --color-text-muted: var(--color-info);
  --color-text-brand: var(--color-primary);
  --color-bg-page: var(--color-base-100);
  --color-bg-card: #ffffff;
  --color-bg-hover: var(--color-base-200);
  --color-border-default: var(--color-base-300);
  --color-accent-savings: var(--color-accent);
  --color-accent-similarity: oklch(from var(--color-accent) l c h / 0.6);
}

/* ── Typography Utilities ── */
@utility text-display {
  font-family: 'DM Serif Display', serif;
  font-size: 1.875rem;  /* text-3xl */
  font-weight: 400;
  line-height: 1.2;
  @media (min-width: 640px) {
    font-size: 2.25rem;  /* text-4xl */
  }
}

@utility text-heading {
  font-size: 1.125rem;  /* text-lg */
  font-weight: 600;
  line-height: 1.4;
  @media (min-width: 640px) {
    font-size: 1.25rem;  /* text-xl */
  }
}

@utility text-body {
  font-size: 0.875rem;  /* text-sm */
  font-weight: 400;
  line-height: 1.5;
  @media (min-width: 640px) {
    font-size: 1rem;  /* text-base */
  }
}

@utility text-caption {
  font-size: 0.75rem;  /* text-xs */
  font-weight: 500;
  line-height: 1.5;
}

@utility text-label {
  font-size: 0.6875rem;  /* 11px */
  font-weight: 400;
  letter-spacing: 0.05em;
  line-height: 1.5;
}
```

- [ ] **Step 2: Create shared formatPrice utility**

```typescript
// src/lib/format.ts
export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/lib/format.ts
git commit -m "Add design tokens and formatPrice utility"
```

---

### Task 2: Atoms

**Files:**
- Create: `src/components/atoms/Badge.tsx`
- Create: `src/components/atoms/Button.tsx`
- Create: `src/components/atoms/Input.tsx`
- Create: `src/components/atoms/ProductImage.tsx`
- Create: `src/components/atoms/Skeleton.tsx`
- Create: `src/components/atoms/Typography.tsx`

- [ ] **Step 1: Create Badge atom**

```tsx
// src/components/atoms/Badge.tsx
interface BadgeProps {
  variant: 'savings' | 'category' | 'similarity';
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeProps['variant'], string> = {
  savings: 'bg-[var(--color-accent-savings)] text-white text-xs font-semibold px-1.5 py-0.5 rounded',
  category: 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] text-xs font-medium px-3 py-1 rounded-full',
  similarity: 'text-[var(--color-accent-similarity)] text-xs',
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`${VARIANT_STYLES[variant]} ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Create Button atom**

```tsx
// src/components/atoms/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'ghost' | 'pill';
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

const VARIANT_STYLES: Record<ButtonProps['variant'], string> = {
  primary: 'bg-primary text-primary-content font-semibold',
  ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors',
  pill: 'rounded-full border text-caption font-medium transition-colors',
};

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-3.5 text-sm',
};

export default function Button({
  variant,
  size = 'md',
  loading = false,
  disabled = false,
  active = false,
  children,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const pillActive = variant === 'pill'
    ? active
      ? 'border-primary bg-primary text-primary-content'
      : 'border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
    : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${pillActive} ${className}`}
    >
      {loading ? <span className="loading loading-spinner loading-xs" /> : children}
    </button>
  );
}
```

- [ ] **Step 3: Create Input atom**

```tsx
// src/components/atoms/Input.tsx
interface InputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  type?: 'text' | 'url';
  id?: string;
  className?: string;
}

export default function Input({
  placeholder,
  value,
  onChange,
  onSubmit,
  disabled = false,
  type = 'text',
  id,
  className = '',
}: InputProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
      disabled={disabled}
      placeholder={placeholder}
      className={`bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-primary)]/30 focus:outline-none ${className}`}
    />
  );
}
```

- [ ] **Step 4: Create ProductImage atom**

```tsx
// src/components/atoms/ProductImage.tsx
import Image from 'next/image';

interface ProductImageProps {
  src: string;
  alt: string;
  aspect?: '3/4' | '1/1' | '4/3';
  radius?: 'sm' | 'none';
  width?: number;
  height?: number;
  className?: string;
}

const ASPECT_MAP = {
  '3/4': 'aspect-[3/4]',
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
};

export default function ProductImage({
  src,
  alt,
  aspect = '3/4',
  radius = 'sm',
  width = 360,
  height = 480,
  className = '',
}: ProductImageProps) {
  return (
    <figure className={`${ASPECT_MAP[aspect]} overflow-hidden ${radius === 'sm' ? 'rounded' : ''} ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </figure>
  );
}
```

- [ ] **Step 5: Create Skeleton atom**

```tsx
// src/components/atoms/Skeleton.tsx
interface SkeletonProps {
  variant: 'card' | 'text' | 'image';
  className?: string;
}

export default function Skeleton({ variant, className = '' }: SkeletonProps) {
  if (variant === 'text') {
    return <div className={`h-4 rounded bg-base-200 animate-pulse ${className}`} />;
  }

  if (variant === 'image') {
    return <div className={`aspect-[3/4] rounded bg-base-200 animate-pulse ${className}`} />;
  }

  // card: image placeholder + 2 text lines
  return (
    <div className={`${className}`}>
      <div className="aspect-[3/4] rounded bg-base-200 animate-pulse" />
      <div className="mt-2.5 space-y-2">
        <div className="h-3 w-16 rounded bg-base-200 animate-pulse" />
        <div className="h-4 w-full rounded bg-base-200 animate-pulse" />
        <div className="h-4 w-20 rounded bg-base-200 animate-pulse" />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create Typography atom**

```tsx
// src/components/atoms/Typography.tsx
import type { ReactNode } from 'react';

interface TypographyProps {
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  variant: 'display' | 'heading' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'muted' | 'accent';
  align?: 'left' | 'center';
  truncate?: boolean | number;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<TypographyProps['variant'], string> = {
  display: 'text-display',
  heading: 'text-heading',
  body: 'text-body',
  caption: 'text-caption',
  label: 'text-label tracking-wider',
};

const COLOR_CLASSES: Record<NonNullable<TypographyProps['color']>, string> = {
  primary: 'text-[var(--color-text-primary)]',
  secondary: 'text-[var(--color-text-secondary)]',
  muted: 'text-[var(--color-text-muted)]',
  accent: 'text-[var(--color-accent-savings)]',
};

const DEFAULT_TAG: Record<TypographyProps['variant'], TypographyProps['as']> = {
  display: 'h1',
  heading: 'h2',
  body: 'p',
  caption: 'p',
  label: 'span',
};

export default function Typography({
  as,
  variant,
  color = 'primary',
  align = 'left',
  truncate,
  children,
  className = '',
}: TypographyProps) {
  const Tag = as ?? DEFAULT_TAG[variant] ?? 'p';

  const truncateClass = truncate === true
    ? 'truncate'
    : typeof truncate === 'number'
      ? `line-clamp-${truncate}`
      : '';

  const alignClass = align === 'center' ? 'text-center' : '';

  return (
    <Tag className={`${VARIANT_CLASSES[variant]} ${COLOR_CLASSES[color]} ${alignClass} ${truncateClass} ${className}`}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 7: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. Atoms are created but not yet imported anywhere.

- [ ] **Step 8: Commit**

```bash
git add src/components/atoms/
git commit -m "Add atom components: Badge, Button, Input, ProductImage, Skeleton, Typography"
```

---

### Task 3: Molecules

**Files:**
- Create: `src/components/molecules/ProductCard.tsx`
- Create: `src/components/molecules/SourceCard.tsx`
- Create: `src/components/molecules/SearchBar.tsx`
- Create: `src/components/molecules/BrandTab.tsx`
- Create: `src/components/molecules/GenderTab.tsx`
- Create: `src/components/molecules/CategoryPill.tsx`
- Create: `src/components/molecules/EmptyState.tsx`

- [ ] **Step 1: Create ProductCard molecule**

```tsx
// src/components/molecules/ProductCard.tsx
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
```

- [ ] **Step 2: Create SourceCard molecule**

```tsx
// src/components/molecules/SourceCard.tsx
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
```

- [ ] **Step 3: Create SearchBar molecule**

```tsx
// src/components/molecules/SearchBar.tsx
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  loading = false,
  placeholder = '럭셔리 브랜드 상품 URL을 붙여넣으세요',
  className = '',
}: SearchBarProps) {
  return (
    <div className={className}>
      <form onSubmit={onSubmit}>
        <div className="flex overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-page)] transition-colors focus-within:border-[var(--color-text-secondary)]">
          <label htmlFor="url-input" className="sr-only">상품 URL</label>
          <Input
            id="url-input"
            type="url"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={loading}
            className="flex-1 px-4 py-3.5"
          />
          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={loading}
            disabled={!value.trim()}
            className="shrink-0 rounded-none"
          >
            찾기
          </Button>
        </div>
      </form>
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
        또는 아래에서 상품을 직접 탐색하세요
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create BrandTab molecule**

```tsx
// src/components/molecules/BrandTab.tsx
interface BrandTabProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function BrandTab({ label, active, disabled = false, onClick }: BrandTabProps) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      className={[
        'shrink-0 pb-3 text-xs font-semibold uppercase tracking-widest',
        'transition-colors duration-150 border-b-2 -mb-px',
        active
          ? 'border-primary text-primary'
          : disabled
            ? 'border-transparent text-[var(--color-text-primary)]/20 cursor-not-allowed'
            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 5: Create GenderTab molecule**

```tsx
// src/components/molecules/GenderTab.tsx
interface GenderTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function GenderTab({ label, active, onClick }: GenderTabProps) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-1 py-1.5 text-sm transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]/60'
      }`}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 6: Create CategoryPill molecule**

```tsx
// src/components/molecules/CategoryPill.tsx
interface CategoryPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function CategoryPill({ label, active, onClick }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-content'
          : 'border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
      }`}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 7: Create EmptyState molecule**

```tsx
// src/components/molecules/EmptyState.tsx
interface EmptyStateProps {
  variant: 'coming-soon' | 'no-results' | 'error';
  message?: string;
  brandLabel?: string;
  className?: string;
}

const DEFAULTS: Record<EmptyStateProps['variant'], string> = {
  'coming-soon': '상품을 준비 중입니다',
  'no-results': '등록된 상품이 없습니다',
  'error': '오류가 발생했습니다',
};

export default function EmptyState({ variant, message, brandLabel, className = '' }: EmptyStateProps) {
  const displayMessage = message ?? (
    variant === 'coming-soon' && brandLabel
      ? `${brandLabel} 상품을 준비 중입니다`
      : DEFAULTS[variant]
  );

  return (
    <div className={`flex flex-col items-center gap-3 py-20 text-center ${className}`}>
      {variant === 'coming-soon' && (
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-primary)]/20">
          Coming Soon
        </p>
      )}
      <p className="text-xs text-[var(--color-text-secondary)]">
        {displayMessage}
      </p>
    </div>
  );
}
```

- [ ] **Step 8: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. Molecules are created but not yet imported by page.tsx.

- [ ] **Step 9: Commit**

```bash
git add src/components/molecules/
git commit -m "Add molecule components: ProductCard, SourceCard, SearchBar, BrandTab, GenderTab, CategoryPill, EmptyState"
```

---

### Task 4: Organisms

**Files:**
- Create: `src/components/organisms/BrandNav.tsx`
- Create: `src/components/organisms/CategoryFilter.tsx`
- Create: `src/components/organisms/GenderToggle.tsx`
- Create: `src/components/organisms/ProductGrid.tsx`
- Create: `src/components/organisms/RecommendSection.tsx`
- Create: `src/components/organisms/LoadingOverlay.tsx`

- [ ] **Step 1: Create BrandNav organism**

```tsx
// src/components/organisms/BrandNav.tsx
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
```

- [ ] **Step 2: Create CategoryFilter organism**

```tsx
// src/components/organisms/CategoryFilter.tsx
import type { Category } from '@/types/brand';
import CategoryPill from '@/components/molecules/CategoryPill';

interface CategoryFilterProps {
  selected: Category;
  onSelect: (category: Category) => void;
}

const UI_CATEGORIES: { key: Category; label: string }[] = [
  { key: 'outerwear', label: '아우터' },
  { key: 'tops', label: '상의' },
  { key: 'bottoms', label: '하의' },
  { key: 'bags', label: '가방' },
  { key: 'shoes', label: '신발' },
];

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide sm:flex-wrap sm:justify-center">
      {UI_CATEGORIES.map(({ key, label }) => (
        <CategoryPill
          key={key}
          label={label}
          active={selected === key}
          onClick={() => onSelect(key)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create GenderToggle organism**

```tsx
// src/components/organisms/GenderToggle.tsx
import type { Gender } from '@/types/brand';
import GenderTab from '@/components/molecules/GenderTab';

interface GenderToggleProps {
  selected: Gender;
  onSelect: (gender: Gender) => void;
}

const OPTIONS: { key: Gender; label: string }[] = [
  { key: 'women', label: '여성' },
  { key: 'men', label: '남성' },
];

export default function GenderToggle({ selected, onSelect }: GenderToggleProps) {
  return (
    <div className="flex justify-center gap-6">
      {OPTIONS.map(({ key, label }) => (
        <GenderTab
          key={key}
          label={label}
          active={selected === key}
          onClick={() => onSelect(key)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create ProductGrid organism**

```tsx
// src/components/organisms/ProductGrid.tsx
import type { Product } from '@/types/product';
import type { RecommendedItem } from '@/types/product';
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
```

- [ ] **Step 5: Create RecommendSection organism**

```tsx
// src/components/organisms/RecommendSection.tsx
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
```

- [ ] **Step 6: Create LoadingOverlay organism**

```tsx
// src/components/organisms/LoadingOverlay.tsx
'use client';

import { useState, useEffect } from 'react';

const STEPS = [
  { message: '상품 정보를 가져오는 중...', delay: 0 },
  { message: '스타일을 분석하는 중...', delay: 1500 },
  { message: '비슷한 아이템을 찾는 중...', delay: 4000 },
  { message: '거의 다 됐어요...', delay: 7000 },
];

export default function LoadingOverlay() {
  const [stepIndex, setStepIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timers = STEPS.slice(1).map((step, i) =>
      setTimeout(() => {
        setFade(false);
        setTimeout(() => {
          setStepIndex(i + 1);
          setFade(true);
        }, 150);
      }, step.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <span className="loading loading-ring loading-lg" />
      <p
        className={`text-sm text-[var(--color-text-secondary)] transition-opacity duration-150 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {STEPS[stepIndex].message}
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/organisms/
git commit -m "Add organism components: BrandNav, CategoryFilter, GenderToggle, ProductGrid, RecommendSection, LoadingOverlay"
```

---

### Task 5: Barrel Export & Page Migration

**Files:**
- Create: `src/components/index.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create barrel export**

```typescript
// src/components/index.ts

// Atoms
export { default as Badge } from './atoms/Badge';
export { default as Button } from './atoms/Button';
export { default as Input } from './atoms/Input';
export { default as ProductImage } from './atoms/ProductImage';
export { default as Skeleton } from './atoms/Skeleton';
export { default as Typography } from './atoms/Typography';

// Molecules
export { default as ProductCard } from './molecules/ProductCard';
export { default as SourceCard } from './molecules/SourceCard';
export { default as SearchBar } from './molecules/SearchBar';
export { default as BrandTab } from './molecules/BrandTab';
export { default as GenderTab } from './molecules/GenderTab';
export { default as CategoryPill } from './molecules/CategoryPill';
export { default as EmptyState } from './molecules/EmptyState';

// Organisms
export { default as BrandNav } from './organisms/BrandNav';
export { default as CategoryFilter } from './organisms/CategoryFilter';
export { default as GenderToggle } from './organisms/GenderToggle';
export { default as ProductGrid } from './organisms/ProductGrid';
export { default as RecommendSection } from './organisms/RecommendSection';
export { default as LoadingOverlay } from './organisms/LoadingOverlay';
```

- [ ] **Step 2: Update page.tsx imports and component usage**

Replace the import block in `src/app/page.tsx` (lines 1-16):

```tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Category, Gender, BrandSlug } from '@/types/brand';
import { SOURCE_BRANDS } from '@/types/brand';
import type { Product, RecommendationResult } from '@/types/product';
import {
  SearchBar,
  BrandNav,
  GenderToggle,
  CategoryFilter,
  ProductGrid,
  RecommendSection,
  LoadingOverlay,
} from '@/components';
import { trackEvent } from '@/lib/analytics';
```

Then update the component usages in the JSX:

Replace `<UrlSearchBar ... />` (lines 215-220):
```tsx
<SearchBar
  value={urlInput}
  onChange={setUrlInput}
  onSubmit={handleUrlSubmit}
  loading={false}
/>
```

Replace `<GenderToggle ... />` (line 227):
```tsx
<GenderToggle selected={gender} onSelect={handleGenderChange} />
```

Replace `<BrandNav ... />` (line 234):
```tsx
<BrandNav active={activeBrand} onSelect={handleBrandChange} />
```

Replace `<CategoryFilter ... />` (line 241):
```tsx
<CategoryFilter selected={category} onSelect={handleCategoryChange} />
```

Replace `<LoadingProgress />` (line 248):
```tsx
<LoadingOverlay />
```

Replace the browsing product grid block (lines 271-281):
```tsx
{isBrowsing && isBrandAvailable && (
  <ProductGrid
    variant="browse"
    products={products}
    onProductClick={handleProductSelect}
    loading={loadingProducts}
  />
)}
```

Replace the results block (lines 285-312):
```tsx
{status === 'results' && result && (
  <RecommendSection
    source={result.source}
    recommendations={result.recommendations}
  />
)}
```

- [ ] **Step 3: Update handler signatures**

The `GenderToggle` and `CategoryFilter` organisms use `onSelect` instead of `onChange`. Update the handler references:

In `page.tsx`, the existing handlers `handleGenderChange`, `handleCategoryChange`, `handleBrandChange` already match — they accept the right types. The prop names changed from `onChange` to `onSelect` in the organisms, but the handler functions themselves stay the same. Just update the JSX props as shown in Step 2.

The `handleProductSelect` currently takes `productId: string`. The new `ProductGrid` calls `onProductClick` with an `id: string`. These are compatible — no change needed.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. The app uses all new components.

- [ ] **Step 5: Commit**

```bash
git add src/components/index.ts src/app/page.tsx
git commit -m "Migrate page.tsx to design system components with barrel export"
```

---

### Task 6: Cleanup Old Components

**Files:**
- Delete: All 9 original component files in `src/components/`

- [ ] **Step 1: Delete old component files**

```bash
rm src/components/RecommendCard.tsx
rm src/components/SourceCard.tsx
rm src/components/UrlSearchBar.tsx
rm src/components/BrandNav.tsx
rm src/components/CategoryFilter.tsx
rm src/components/GenderToggle.tsx
rm src/components/SourceProductGrid.tsx
rm src/components/LoadingProgress.tsx
rm src/components/BrandComingSoon.tsx
```

- [ ] **Step 2: Verify no stale imports remain**

Run: `grep -r "from '@/components/RecommendCard\|from '@/components/SourceCard\|from '@/components/UrlSearchBar\|from '@/components/BrandNav\|from '@/components/CategoryFilter\|from '@/components/GenderToggle\|from '@/components/SourceProductGrid\|from '@/components/LoadingProgress\|from '@/components/BrandComingSoon" src/`
Expected: No matches.

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no import errors.

- [ ] **Step 4: Commit**

```bash
git add -u src/components/
git commit -m "Remove old component files replaced by design system"
```

---

### Task 7: Documentation

**Files:**
- Create: `docs/design-system/README.md`
- Create: `docs/design-system/tokens.md`
- Create: `docs/design-system/atoms.md`
- Create: `docs/design-system/molecules.md`
- Create: `docs/design-system/organisms.md`
- Create: `docs/design-system/patterns.md`

- [ ] **Step 1: Create README.md**

```markdown
# taste-like Design System

## 원칙
- **시맨틱 토큰 우선**: raw hex 값, 매직넘버 금지. `globals.css`에 정의된 시맨틱 토큰 사용.
- **Atomic 계층 단방향 의존**: atoms ← molecules ← organisms ← pages
- **패션 도메인 특화**: 상품 카드, 브랜드 네비, 가격 표시 등 패션 커머스에 최적화
- **Mobile-first 반응형**: Tailwind 브레이크포인트 (sm: 640px, lg: 1024px)

## 퀵스타트

새 컴포넌트 추가 시:
1. 어느 계층인지 판단 (atom / molecule / organism)
2. 해당 계층 문서에서 기존 유사 컴포넌트 확인
3. Props interface 작성 (`variant` + `className` 필수)
4. 시맨틱 토큰만 사용
5. `src/components/index.ts` barrel export에 추가
6. 이 문서 업데이트

## 목차
- [Tokens](./tokens.md) — 색상, 타이포, 스페이싱
- [Atoms](./atoms.md) — 최소 UI 단위 (Badge, Button, Input, ProductImage, Skeleton, Typography)
- [Molecules](./molecules.md) — Atom 조합 (ProductCard, SourceCard, SearchBar, BrandTab, GenderTab, CategoryPill, EmptyState)
- [Organisms](./organisms.md) — 페이지 섹션 (BrandNav, CategoryFilter, GenderToggle, ProductGrid, RecommendSection, LoadingOverlay)
- [Patterns](./patterns.md) — 공통 UX 패턴
```

- [ ] **Step 2: Create tokens.md**

Full token reference document with all color (semantic + DaisyUI), typography, spacing, and layout tokens. Include the "직접 사용 금지" rule for Layer 1 DaisyUI tokens.

Content should match Section 2 of the spec (`docs/specs/2026-04-12-design-system.md`).

- [ ] **Step 3: Create atoms.md**

Document all 6 atoms using the unified format per component:
- Props table
- Variants description
- Usage example (tsx)
- Token usage table

- [ ] **Step 4: Create molecules.md**

Document all 7 molecules using the same format. ProductCard gets the most detail as the core component.

- [ ] **Step 5: Create organisms.md**

Document all 6 organisms. Note that organisms receive data via props and contain no business logic.

- [ ] **Step 6: Create patterns.md**

Document shared UX patterns:
- Loading: grid skeleton (`ProductGrid loading=true`), full-screen (`LoadingOverlay`)
- Error: `EmptyState error` + retry link
- Empty: `EmptyState coming-soon` / `EmptyState no-results`
- Responsive: breakpoint grid table (2/3/4 cols)
- Price: `formatPrice()` from `src/lib/format.ts`

- [ ] **Step 7: Commit**

```bash
git add docs/design-system/
git commit -m "Add design system documentation"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Visual smoke test**

Run: `npm run dev`
Open http://localhost:3000 and verify:
- Browsing mode: brand nav, gender toggle, category filter, product grid all render
- Click a product: loading overlay appears, then recommendations display
- Back button returns to browsing
- Responsive: check at 375px, 768px, 1280px widths

- [ ] **Step 4: Final commit if any fixes needed**

If visual issues found, fix and commit. Otherwise this step is a no-op.
