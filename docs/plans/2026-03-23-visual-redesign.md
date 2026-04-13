# Visual Redesign Implementation Plan

> Project: [[taste-like]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the taste-like UI from a generic DaisyUI look to a high-end curation aesthetic with cool neutral palette, serif headings, borderless cards, and full Korean localization.

**Architecture:** Pure visual redesign — no changes to UX flow, routing, API, or data model. Replace DaisyUI theme tokens, swap fonts (Geist → Pretendard + DM Serif Display), restyle all components to borderless/cool neutral, and localize all UI labels to Korean. Components are modified in dependency order: theme/layout first, then shared components, then page-level integration.

**Tech Stack:** Next.js 15, Tailwind CSS, DaisyUI v5 (custom theme), Pretendard Variable (CDN), DM Serif Display (Google Fonts)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/globals.css` | Modify | DaisyUI theme tokens → cool neutral palette |
| `src/app/layout.tsx` | Modify | Remove Geist, add Pretendard + DM Serif Display fonts |
| `src/app/page.tsx` | Modify | Update tagline, section labels, max-width, back-nav styling |
| `src/components/UrlSearchBar.tsx` | Modify | Custom search bar (remove DaisyUI join), button text "찾기" |
| `src/components/GenderToggle.tsx` | Modify | Labels → 여성/남성, cool neutral colors |
| `src/components/BrandNav.tsx` | Modify | Cool neutral colors |
| `src/components/CategoryFilter.tsx` | Modify | Pill buttons, Korean labels, remove DaisyUI btn classes |
| `src/components/SourceCard.tsx` | Modify | Source banner style (horizontal card with label) |
| `src/components/RecommendCard.tsx` | Modify | Borderless, indigo accent savings, "유사도" label |
| `src/components/SourceProductGrid.tsx` | Modify | Borderless cards, cool neutral colors |
| `src/components/LoadingProgress.tsx` | Modify | Cool neutral colors |
| `src/components/BrandComingSoon.tsx` | Modify | Cool neutral colors |
| `src/components/seo/StylePairCard.tsx` | Modify | Cool neutral colors, indigo accent |
| `src/components/seo/CategoryNav.tsx` | Modify | Pill buttons, cool neutral |
| `src/components/seo/BrandFilterGrid.tsx` | Modify | Pill buttons, cool neutral |
| `src/components/seo/CtaBanner.tsx` | Modify | Cool neutral colors |

---

### Task 1: Theme & Font Foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update DaisyUI theme tokens in globals.css**

Replace the theme block in `src/app/globals.css`:

```css
@plugin "daisyui/theme" {
  name: "taste";
  default: true;

  --color-base-100: #f8f9fb;
  --color-base-200: #f1f5f9;
  --color-base-300: #e2e8f0;
  --color-base-content: #1e293b;

  --color-primary: #1e293b;
  --color-primary-content: #ffffff;

  --color-secondary: #94a3b8;
  --color-secondary-content: #ffffff;

  --color-accent: #6366f1;
  --color-accent-content: #ffffff;

  --color-neutral: #334155;
  --color-neutral-content: #ffffff;

  --color-info: #64748b;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;

  --rounded-box: 0.5rem;
  --rounded-btn: 0.375rem;
  --rounded-badge: 0.25rem;
}
```

- [ ] **Step 2: Replace Geist font with Pretendard + DM Serif Display in layout.tsx**

Remove the Geist import and font variable. Replace with CDN links in `<head>` and update the body className.

```tsx
// Remove these lines:
// import { Geist } from "next/font/google";
// const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// In <html>, add:
<head>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet" />
  <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
</head>

// Update body className:
<body className="font-sans antialiased" style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif" }}>
```

- [ ] **Step 3: Build and verify no errors**

Run: `npm run build`
Expected: Build succeeds, no font-related errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "redesign: swap theme to cool neutral palette and fonts to Pretendard + DM Serif Display"
```

---

### Task 2: Header & Search Bar

**Files:**
- Modify: `src/app/page.tsx` (header section only, lines 202-222)
- Modify: `src/components/UrlSearchBar.tsx`

- [ ] **Step 1: Update header in page.tsx**

Change the header section (Zone A, around line 203-209):

```tsx
{/* Zone A: Header */}
{isBrowsing && (
  <div className="mb-8 text-center">
    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">생로랑 맛 자라 찾기</h1>
    <p className="mt-1.5 text-sm text-secondary">
      같은 맛, 다른 가격
    </p>
  </div>
)}
```

Also update the back-nav bar logo text (around line 198) and the `max-w-5xl` container (line 191) to `max-w-4xl`.

- [ ] **Step 2: Restyle UrlSearchBar.tsx**

Replace the DaisyUI `join` pattern with a custom search bar:

```tsx
export default function UrlSearchBar({ value, onChange, onSubmit, loading }: UrlSearchBarProps) {
  return (
    <div>
      <form onSubmit={onSubmit}>
        <div className="flex overflow-hidden rounded-lg border border-base-300 bg-base-100 transition-colors focus-within:border-secondary">
          <label htmlFor="url-input" className="sr-only">상품 URL</label>
          <input
            id="url-input"
            type="url"
            className="flex-1 bg-transparent px-4 py-3.5 text-sm text-base-content placeholder:text-base-content/30 focus:outline-none"
            placeholder="럭셔리 브랜드 상품 URL을 붙여넣으세요"
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="shrink-0 bg-primary px-5 py-3.5 text-sm font-semibold text-primary-content"
            disabled={!value.trim() || loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              '찾기'
            )}
          </button>
        </div>
      </form>
      <p className="mt-1.5 text-xs text-secondary">
        또는 아래에서 상품을 직접 탐색하세요
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-secondary">
        {getSourceNames().map(name => (
          <span key={name} className="rounded bg-base-200 px-1.5 py-0.5 text-base-content/60">{name}</span>
        ))}
        <span>스타일의 아이템을</span>
        {ALTERNATIVE_BRAND_LABELS.map(name => (
          <span key={name} className="rounded bg-base-200 px-1.5 py-0.5 text-base-content/60">{name}</span>
        ))}
        <span>에서 찾아드려요</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify visually with dev server**

Run: `npm run dev`
Check: Header shows "생로랑 맛 자라 찾기" + "같은 맛, 다른 가격". Search bar has clean border style without DaisyUI join.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/UrlSearchBar.tsx
git commit -m "redesign: update header tagline and search bar to cool neutral style"
```

---

### Task 3: Gender Toggle & Brand Nav

**Files:**
- Modify: `src/components/GenderToggle.tsx`
- Modify: `src/components/BrandNav.tsx`

- [ ] **Step 1: Update GenderToggle labels and colors**

```tsx
const OPTIONS: { key: Gender; label: string }[] = [
  { key: 'women', label: '여성' },
  { key: 'men', label: '남성' },
];

export default function GenderToggle({ selected, onChange }: GenderToggleProps) {
  return (
    <div className="flex justify-center gap-6">
      {OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          className={`border-b-2 px-1 py-1.5 text-sm transition-colors ${
            selected === key
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-base-content/60'
          }`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update BrandNav colors**

Update class names in `BrandNav.tsx` to use cool neutral tokens:

```tsx
className={[
  'shrink-0 pb-3 text-xs font-semibold uppercase tracking-widest',
  'transition-colors duration-150',
  active === brand.slug
    ? 'border-b-2 border-primary text-primary -mb-px'
    : brand.available
      ? 'text-secondary hover:text-base-content border-b-2 border-transparent -mb-px'
      : 'text-base-content/20 cursor-not-allowed border-b-2 border-transparent -mb-px',
].join(' ')}
```

Note: `border-base-300` on the parent div should already pick up the new theme value.

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Check: Gender shows "여성 / 남성". Brand tabs use slate tones. Active states have proper underline.

- [ ] **Step 4: Commit**

```bash
git add src/components/GenderToggle.tsx src/components/BrandNav.tsx
git commit -m "redesign: localize gender toggle and apply cool neutral to brand nav"
```

---

### Task 4: Category Filter — Pill Buttons

**Files:**
- Modify: `src/components/CategoryFilter.tsx`

- [ ] **Step 1: Replace DaisyUI btn classes with pill buttons and Korean labels**

```tsx
const UI_CATEGORIES: { key: Category; label: string }[] = [
  { key: 'outerwear', label: '아우터' },
  { key: 'tops', label: '상의' },
  { key: 'bottoms', label: '하의' },
  { key: 'bags', label: '가방' },
  { key: 'shoes', label: '신발' },
];

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide sm:flex-wrap sm:justify-center">
      {UI_CATEGORIES.map(({ key, label }) => (
        <button
          key={key}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
            selected === key
              ? 'border-primary bg-primary text-primary-content'
              : 'border-base-300 text-info hover:border-secondary hover:text-base-content'
          }`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: Category buttons are pill-shaped with rounded-full. Active is dark fill, inactive has border only. Labels are Korean.

- [ ] **Step 3: Commit**

```bash
git add src/components/CategoryFilter.tsx
git commit -m "redesign: category filter to pill buttons with Korean labels"
```

---

### Task 5: Browse Grid — Borderless Cards

**Files:**
- Modify: `src/components/SourceProductGrid.tsx`

- [ ] **Step 1: Remove card/shadow classes, apply borderless style**

```tsx
export default function SourceProductGrid({ products, onSelect }: SourceProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-secondary">
        등록된 상품이 없습니다
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onSelect(product.id)}
          className="group text-left"
        >
          <figure className="aspect-[3/4] overflow-hidden rounded">
            <Image
              src={product.image_url}
              alt={product.name}
              width={360}
              height={480}
              className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
            />
          </figure>
          <div className="mt-2.5">
            <p className="text-[11px] tracking-wider text-secondary">
              {product.brand}
            </p>
            <h3 className="mt-0.5 text-sm font-medium leading-snug text-base-content line-clamp-2">{product.name}</h3>
            <p className="mt-1 text-sm font-semibold">{formatPrice(product.price)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: Product cards have no shadow or border. Hover dims image. Text hierarchy uses slate tones.

- [ ] **Step 3: Commit**

```bash
git add src/components/SourceProductGrid.tsx
git commit -m "redesign: borderless product grid with cool neutral typography"
```

---

### Task 6: Source Card — Banner Style

**Files:**
- Modify: `src/components/SourceCard.tsx`

- [ ] **Step 1: Restyle as horizontal source banner**

```tsx
export default function SourceCard({ product }: SourceCardProps) {
  return (
    <a
      href={product.product_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-5 rounded-lg border border-base-300 bg-base-100 p-5 transition-colors hover:border-secondary"
    >
      <figure className="w-24 shrink-0 overflow-hidden rounded sm:w-28">
        <Image
          src={product.image_url}
          alt={product.name}
          width={160}
          height={213}
          className="aspect-[3/4] w-full object-cover"
        />
      </figure>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-wider text-secondary">
          원본 상품
        </p>
        <h2 className="mt-1 font-['DM_Serif_Display',serif] text-lg leading-snug sm:text-xl">
          {product.name}
        </h2>
        <p className="mt-0.5 text-xs text-secondary">
          {product.brand}
        </p>
        <p className="mt-2 text-base font-semibold">{formatPrice(product.price)}</p>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Update results section labels in page.tsx**

Update the results section (around lines 287-311 of `page.tsx`):

```tsx
{/* Source Product — remove the h2 label, SourceCard now has its own "원본 상품" label */}
<section>
  <SourceCard product={result.source} />
</section>

{/* Recommendations */}
<section>
  <div className="mb-5 flex items-baseline gap-2">
    <h2 className="text-base font-semibold">추천 대안</h2>
    <span className="text-sm text-secondary">
      {result.recommendations.length}개의 대안을 찾았어요
    </span>
  </div>
  {result.recommendations.length === 0 ? (
    <p className="py-8 text-center text-secondary">
      유사한 상품을 찾지 못했습니다
    </p>
  ) : (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
      {result.recommendations.map((item) => (
        <RecommendCard key={item.id} item={item} />
      ))}
    </div>
  )}
</section>
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Test by clicking a product to see results view. Check: Source banner is horizontal with "원본 상품" label. Recommendations header says "추천 대안" + count.

- [ ] **Step 4: Commit**

```bash
git add src/components/SourceCard.tsx src/app/page.tsx
git commit -m "redesign: source card as banner, localize results section labels"
```

---

### Task 7: Recommendation Cards — Borderless + Indigo Accent

**Files:**
- Modify: `src/components/RecommendCard.tsx`

- [ ] **Step 1: Restyle to borderless with indigo savings**

```tsx
export default function RecommendCard({ item }: RecommendCardProps) {
  return (
    <a
      href={item.product_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group"
      onClick={() => trackEvent({
        action: 'click_recommendation',
        params: {
          product_name: item.name,
          brand: item.brand,
          category: item.category,
          price: item.price,
          similarity: Math.round(item.similarity * 100),
        },
      })}
    >
      <figure className="aspect-[3/4] overflow-hidden rounded">
        <Image
          src={item.image_url}
          alt={item.name}
          width={360}
          height={480}
          className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
        />
      </figure>
      <div className="mt-2.5">
        <p className="text-[11px] tracking-wider text-secondary">
          {item.brand}
        </p>
        <h3 className="mt-0.5 text-sm font-medium leading-snug text-base-content line-clamp-2">{item.name}</h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-sm font-semibold sm:text-base">
            {formatPrice(item.price)}
          </span>
          <span className="text-xs font-semibold text-accent">
            -{item.savings_percent}%
          </span>
        </div>
        {item.similarity > 0 && (
          <p className="mt-1 text-xs text-secondary">
            유사도 {Math.round(item.similarity * 100)}%
          </p>
        )}
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Check: Recommendation cards are borderless. Savings shows in indigo. No DaisyUI card/badge classes remain.

- [ ] **Step 3: Commit**

```bash
git add src/components/RecommendCard.tsx
git commit -m "redesign: borderless recommendation cards with indigo savings accent"
```

---

### Task 8: Loading & Coming Soon States

**Files:**
- Modify: `src/components/LoadingProgress.tsx`
- Modify: `src/components/BrandComingSoon.tsx`

- [ ] **Step 1: Update LoadingProgress colors**

Change the text color class:

```tsx
<p className={`text-sm text-secondary transition-opacity duration-150 ${
  fade ? 'opacity-100' : 'opacity-0'
}`}>
```

- [ ] **Step 2: Update BrandComingSoon colors**

```tsx
export default function BrandComingSoon({ brandLabel }: BrandComingSoonProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-base-content/20">
        Coming Soon
      </p>
      <p className="text-xs text-secondary">
        {brandLabel} 상품을 준비 중입니다
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LoadingProgress.tsx src/components/BrandComingSoon.tsx
git commit -m "redesign: cool neutral colors for loading and coming soon states"
```

---

### Task 9: SEO Components

**Files:**
- Modify: `src/components/seo/StylePairCard.tsx`
- Modify: `src/components/seo/CategoryNav.tsx`
- Modify: `src/components/seo/BrandFilterGrid.tsx`
- Modify: `src/components/seo/CtaBanner.tsx`

- [ ] **Step 1: Update StylePairCard.tsx**

Replace DaisyUI classes with cool neutral:
- `card bg-base-100 shadow-sm` → remove shadow: `rounded-lg border border-base-300`
- `badge badge-accent badge-sm` → `text-xs font-semibold text-accent`
- `text-secondary` → already maps to new `#94a3b8`
- `border-base-200` → `border-base-300` (only one border token now)
- `text-base-content/50` → `text-secondary`

- [ ] **Step 2: Update CategoryNav.tsx to pill buttons**

```tsx
export default function CategoryNav({ comboSlug, activeCategory }: Props) {
  const basePath = `/style/${comboSlug}`;

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      <Link
        href={basePath}
        className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
          !activeCategory
            ? 'border-primary bg-primary text-primary-content'
            : 'border-base-300 text-info hover:border-secondary hover:text-base-content'
        }`}
      >
        전체
      </Link>
      {SEO_CATEGORIES.map((cat) => (
        <Link
          key={cat}
          href={`${basePath}/${cat}`}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
            activeCategory === cat
              ? 'border-primary bg-primary text-primary-content'
              : 'border-base-300 text-info hover:border-secondary hover:text-base-content'
          }`}
        >
          {getCategoryLabelKo(cat)}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Update BrandFilterGrid.tsx to pill buttons**

Replace `btn btn-sm` / `btn-secondary` / `btn-ghost` with the same pill pattern used in CategoryNav/CategoryFilter.

- [ ] **Step 4: Update CtaBanner.tsx**

```tsx
export default function CtaBanner() {
  return (
    <section className="rounded-lg bg-base-200 px-6 py-8 text-center">
      <h2 className="text-lg font-bold sm:text-xl">
        다른 브랜드도 비교해보세요
      </h2>
      <p className="mt-2 text-sm text-secondary">
        URL을 입력하면 AI가 비슷한 스타일의 합리적 대안을 찾아드립니다
      </p>
      <Link href="/" className="mt-4 inline-block rounded-full border border-primary bg-primary px-5 py-2 text-sm font-medium text-primary-content transition-colors hover:bg-base-content">
        직접 찾아보기 →
      </Link>
    </section>
  );
}
```

- [ ] **Step 5: Verify SEO pages visually**

Run: `npm run dev`
Navigate to a style page (e.g., `/style/zara-saint-laurent-style`). Check: Cards use cool neutral, pill buttons, indigo accent for savings.

- [ ] **Step 6: Commit**

```bash
git add src/components/seo/StylePairCard.tsx src/components/seo/CategoryNav.tsx src/components/seo/BrandFilterGrid.tsx src/components/seo/CtaBanner.tsx
git commit -m "redesign: apply cool neutral and pill buttons to SEO components"
```

---

### Task 10: Final Polish & Build Verification

**Files:**
- Modify: `src/app/page.tsx` (footer, error state, browsing loading)

- [ ] **Step 1: Update remaining page.tsx elements**

Footer border and text colors (around line 317-335):
- `border-base-300` → already updated via theme
- `text-base-content/50` → `text-secondary`
- `text-base-content/40` → `text-secondary`

Error state (around line 252):
- `text-error` stays (semantic)
- `text-base-content/60` → `text-secondary`
- `btn btn-outline btn-sm` → `rounded-full border border-base-300 px-4 py-1.5 text-xs font-medium text-info hover:border-secondary hover:text-base-content`

Back-nav bar (around line 194):
- `border-base-300` → already updated
- `btn btn-ghost btn-sm` → `text-sm text-secondary hover:text-base-content`

Browsing loading spinner (around line 273-275): already uses DaisyUI loading ring, which is fine.

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: Build succeeds with zero errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new lint errors.

- [ ] **Step 4: Visual review checklist**

Run: `npm run dev` and manually check:
- [ ] Header: "생로랑 맛 자라 찾기" + "같은 맛, 다른 가격"
- [ ] Search bar: Clean border, "찾기" button
- [ ] Gender: "여성 / 남성"
- [ ] Brand nav: Cool slate tones
- [ ] Category: Pill buttons, Korean labels
- [ ] Browse grid: Borderless cards, hover opacity
- [ ] Results: Source banner + "추천 대안" + borderless recommendation cards
- [ ] Savings: Indigo accent
- [ ] SEO pages: Consistent styling

- [ ] **Step 5: Commit final polish**

```bash
git add src/app/page.tsx
git commit -m "redesign: final polish — footer, error state, back-nav cool neutral"
```
