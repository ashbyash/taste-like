# taste-like UI Redesign Plan

> Project: [[taste-like]]

**Version**: 1.0
**Date**: 2026-02-27
**Status**: Planning — ready for implementation
**Scope**: `src/app/page.tsx` + new/modified components only. No routing changes.

---

## 1. Layout Architecture

The page uses a single-column, max-width-constrained layout with three distinct vertical zones. The key insight: the header zone (logo + search + brand nav) is **always visible** in browsing mode, and fully **collapses** in results mode to maximize product space.

### Overall Page Structure

```
<main>  px-4 py-8 sm:py-12, min-h-screen
  <div>  max-w-5xl mx-auto space-y-0

    ┌─────────────────────────────────┐
    │  ZONE A: Header                 │  always visible in browsing
    │  logo wordmark + tagline        │  collapses to minimal bar in results
    ├─────────────────────────────────┤
    │  ZONE B: Search Bar             │  always visible in browsing
    │  URL input + submit             │  hidden in results
    ├─────────────────────────────────┤
    │  ZONE C: Brand Navigation       │  always visible in browsing
    │  brand tabs                     │  hidden in results
    ├─────────────────────────────────┤
    │  ZONE D: Category Filter        │  below brand tabs in browsing
    │  category pills                 │  hidden in results
    ├─────────────────────────────────┤
    │  ZONE E: Content Area           │  product grid / loading / results / error
    └─────────────────────────────────┘

```

### Zone Spacing

| Zone | Top margin | Bottom margin | Notes |
|------|-----------|---------------|-------|
| A Header | — | mb-8 | Top of page |
| B Search | — | mb-5 | Immediately below header |
| C Brand Nav | — | mb-4 | Flush with search |
| D Category | — | mb-6 | Separator before grid |
| E Content | — | — | Grows to fill remaining space |

---

## 2. Component Hierarchy

### Current vs. New

```
page.tsx (client)
├── [NEW]  UrlSearchBar          — URL input + submit button
├── [NEW]  BrandNav              — brand tab switcher
├── [MOD]  CategoryFilter        — repositioned, no logic change
├── [KEEP] SourceProductGrid     — no changes
├── [KEEP] SourceCard            — no changes
├── [KEEP] RecommendCard         — no changes
└── [NEW]  BrandComingSoon       — empty state for inactive brands
```

### State additions to `page.tsx`

Two new state values are added. All existing state remains unchanged.

```typescript
// Add to existing state:
const [urlInput, setUrlInput] = useState('');
const [activeBrand, setActiveBrand] = useState<BrandSlug>('saint-laurent');
```

Where `BrandSlug` is a new union type:
```typescript
type BrandSlug = 'saint-laurent' | 'bottega-veneta' | 'prada' | 'balenciaga';
```

The `activeBrand` drives:
1. Which brand tab appears active in `BrandNav`
2. Whether `SourceProductGrid` shows products or `BrandComingSoon`
3. The `brand` query param sent to `/api/products/source` (future — API does not filter by brand today)

### New handler in `page.tsx`

```typescript
async function handleUrlSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!urlInput.trim()) return;
  setStatus('loading');
  setError('');
  setResult(null);

  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.trim() }),
    });
    const data = await res.json();
    if (!data.success) { setStatus('error'); setError(data.error); return; }
    setResult(data.data);
    setStatus('results');
  } catch {
    setStatus('error');
    setError('서버에 연결할 수 없습니다');
  }
}
```

---

## 3. Search Bar Design

### Intent

The bar should feel like a minimal, editorial input — not a typical SaaS search field. Inspired by COS and SSENSE: generous padding, thin border, no rounded pill, understated placeholder.

### Visual Specification

```
┌──────────────────────────────────────────────────┬─────────────┐
│  https://www.ysl.com/ko-kr/...                   │  찾아보기    │
└──────────────────────────────────────────────────┴─────────────┘
   border-base-300, focus:border-primary              btn-primary
   text-sm, placeholder:text-base-content/40           btn-sm sm:btn-md
```

**DaisyUI implementation:**

```jsx
<form onSubmit={handleUrlSubmit}>
  <div className="join w-full">
    <input
      type="url"
      className="input input-bordered join-item w-full text-sm
                 placeholder:text-base-content/40 focus:outline-none
                 focus:border-primary"
      placeholder="럭셔리 브랜드 상품 URL을 붙여넣으세요 (예: ysl.com/...)"
      value={urlInput}
      onChange={e => setUrlInput(e.target.value)}
      disabled={status === 'loading'}
    />
    <button
      type="submit"
      className="btn btn-primary join-item shrink-0"
      disabled={!urlInput.trim() || status === 'loading'}
    >
      {status === 'loading' ? (
        <span className="loading loading-spinner loading-xs" />
      ) : '찾아보기'}
    </button>
  </div>
</form>
```

**Behavior notes:**
- `join` class fuses input + button into one visually contiguous unit (DaisyUI join pattern)
- Button shows spinner during loading, not "찾아보기"
- Input disabled while any loading is in progress
- On mobile, button text collapses to icon only at `< sm`: use `<span className="hidden sm:inline">찾아보기</span>` + search icon always visible
- Clear input on successful back-navigation (`handleBack` already clears status, also call `setUrlInput('')`)

### Helper text

Directly below the input, in `browsing` state only:

```jsx
<p className="mt-1.5 text-xs text-base-content/40">
  또는 아래에서 상품을 직접 탐색하세요
</p>
```

---

## 4. Brand Navigation Design

### Design Philosophy

Luxury brand navigation should not look like browser tabs. Reference: Net-a-Porter's "Designers" index uses all-caps spaced text. COS uses a clean horizontal list with an underline active indicator.

**Pattern chosen: underline-style horizontal list** (not DaisyUI `tabs` — those are too rounded/colored for this brand context).

### Visual Specification — Brand Nav

```
  SAINT LAURENT     BOTTEGA VENETA     PRADA     BALENCIAGA
  ─────────────                                              ← 2px underline, primary color
```

Active brand: `text-primary font-semibold` + `border-b-2 border-primary pb-0.5`
Inactive brand: `text-base-content/50 hover:text-base-content` + no underline
Coming-soon brand (no products): same style + `cursor-default` opacity-40, no click

### Component: `BrandNav`

```typescript
interface BrandNavProps {
  active: BrandSlug;
  onChange: (brand: BrandSlug) => void;
}

const BRANDS: { slug: BrandSlug; label: string; available: boolean }[] = [
  { slug: 'saint-laurent', label: 'Saint Laurent', available: true  },
  { slug: 'bottega-veneta', label: 'Bottega Veneta', available: false },
  { slug: 'prada',          label: 'Prada',          available: false },
  { slug: 'balenciaga',     label: 'Balenciaga',     available: false },
];
```

**Implementation pattern:**

```jsx
<nav aria-label="브랜드 선택">
  <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-base-300 pb-0">
    {BRANDS.map(brand => (
      <button
        key={brand.slug}
        onClick={() => brand.available && onChange(brand.slug)}
        disabled={!brand.available}
        aria-current={active === brand.slug ? 'page' : undefined}
        className={[
          'shrink-0 pb-3 text-xs font-semibold uppercase tracking-widest',
          'transition-colors duration-150',
          active === brand.slug
            ? 'border-b-2 border-primary text-primary -mb-px'
            : brand.available
              ? 'text-base-content/50 hover:text-base-content border-b-2 border-transparent -mb-px'
              : 'text-base-content/25 cursor-not-allowed border-b-2 border-transparent -mb-px',
        ].join(' ')}
      >
        {brand.label}
      </button>
    ))}
  </div>
</nav>
```

**Extensibility strategy:**
Adding a new brand = one object added to the `BRANDS` array in `BrandNav.tsx`. When `available: true` is set, the brand becomes clickable and the grid query adds `?brand=slug`. No other code changes are needed for the nav layer.

**Mobile scrolling:** The nav container uses `overflow-x-auto` so all brand labels remain full-width on small screens without wrapping. `-mb-px` negative margin trick keeps the button's bottom border flush on top of the container's `border-b`.

### Component: `BrandComingSoon`

Shown in the content area when `activeBrand` has `available: false`.

```jsx
<div className="flex flex-col items-center gap-3 py-20 text-center">
  <p className="text-sm font-semibold uppercase tracking-widest text-base-content/30">
    Coming Soon
  </p>
  <p className="text-xs text-base-content/40">
    {brandLabel} 상품을 준비 중입니다
  </p>
</div>
```

---

## 5. State Transitions

### State Machine (unchanged logic, new visual treatment)

```
browsing  ──(URL submit)──→  loading  ──(success)──→  results
browsing  ──(card click)──→  loading  ──(success)──→  results
loading                    ──(error)──→  error
results   ──(back)──────────────────────────────────→  browsing
error     ──(back)──────────────────────────────────→  browsing
```

### What changes on each transition

**browsing → loading (either path):**
- If URL submit: search button becomes spinner, input disabled
- If card click: card gains `opacity-50 pointer-events-none` via a `loadingProductId` state variable (new)
- Zones A/B/C/D remain rendered but visually frozen
- Content area (Zone E) is replaced by centered spinner

**loading → results:**
- Zones A, B, C, D unmount (conditional render: `status === 'browsing'`)
- Zone A compresses to a minimal back-nav bar:
  ```
  ← 돌아가기      taste-like
  ```
  Left: `btn btn-ghost btn-sm`, Right: small wordmark `text-sm font-bold tracking-tight`
- Result content fades in via `animate-in fade-in` (Tailwind v4 animation)

**results → browsing (back):**
- Zones B, C, D re-mount
- Zone A expands back to full header
- `urlInput` cleared, `result` cleared, `status` set to 'browsing'

**loading → error:**
- Same Zone A/B/C/D collapse as results
- Content area shows the alert with back button

### Animation approach

Use Tailwind's `transition-opacity` on the content zone only. No complex animation libraries needed for PoC.

```jsx
// Content zone wrapper
<div className={`transition-opacity duration-200 ${status === 'loading' ? 'opacity-0' : 'opacity-100'}`}>
  {/* content */}
</div>
```

Full-page fade-in on results mount:
```jsx
// Results section
<div className="animate-[fadeIn_200ms_ease-out]">
```
Define `@keyframes fadeIn` in `globals.css` or use Tailwind v4's built-in `animate-in` if available.

---

## 6. Responsive Breakpoints

### Zone A — Header

| Breakpoint | Layout |
|------------|--------|
| mobile (default) | `text-center`, h1 `text-3xl`, tagline `text-sm` |
| sm (640px+) | `text-center`, h1 `text-4xl`, tagline `text-base` |
| lg (1024px+) | `text-center`, h1 `text-4xl` (same) |

In results mode, back-nav bar is always single row, left-aligned.

### Zone B — Search Bar

| Breakpoint | Layout |
|------------|--------|
| mobile | Full width, `join` stretches to container, button shows icon only |
| sm+ | Button shows `찾아보기` text |
| lg+ | max-width constrained to 80% of container (optional: `sm:max-w-2xl mx-auto`) |

### Zone C — Brand Nav

| Breakpoint | Layout |
|------------|--------|
| mobile | Horizontally scrollable, no wrapping, `overflow-x-auto` |
| sm+ | All brands visible without scroll (for 4 brands) |
| lg+ | Same, with more generous gap `gap-8` |

### Zone D — Category Filter

| Breakpoint | Layout |
|------------|--------|
| mobile | Horizontally scrollable `flex flex-nowrap overflow-x-auto gap-2` |
| sm+ | Wrapping `flex-wrap` is fine — 7 items fit on 2 rows maximum |

**Note:** Current `CategoryFilter` uses `flex-wrap` which causes wrapping on mobile. Change to `flex-nowrap overflow-x-auto` on mobile, `flex-wrap` on sm+:

```jsx
<div className="flex flex-nowrap gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide">
```

### Zone E — Product Grid

| Breakpoint | Columns | Gap |
|------------|---------|-----|
| mobile | 2 | gap-3 |
| sm (640px+) | 3 | gap-3 |
| lg (1024px+) | 4 | gap-4 |

This matches the current `SourceProductGrid` — no change needed.

### Results Grid — Recommendation Cards

| Breakpoint | Columns | Gap |
|------------|---------|-----|
| mobile | 1 | gap-4 |
| sm (640px+) | 2 | gap-4 |
| lg (1024px+) | 3 | gap-4 |

This matches the current results grid — no change needed.

---

## 7. Visual Reference — ASCII Wireframes

### 7a. Mobile Browsing State (375px)

```
┌────────────────────────────────┐
│                                │  py-8
│          taste-like            │  text-3xl bold, centered
│    럭셔리 아이템의 저렴한 대안   │  text-sm, text-secondary, centered
│                                │  mb-8
├────────────────────────────────┤
│ ┌──────────────────────┬──────┐│  mb-5
│ │ URL을 붙여넣으세요...  │  🔍  ││  join input+btn
│ └──────────────────────┴──────┘│
│  또는 아래에서 직접 탐색하세요   │  text-xs, text-content/40
├────────────────────────────────┤
│ SAINT LO  BOTTEGA  PRADA  BAL  │  mb-4, overflow-x-scroll
│ ─────────                      │  2px underline on active
├────────────────────────────────┤
│  ← scroll →                   │  mb-6, overflow-x-scroll
│ [All][Bags][Shoes][Out][Top]   │  btn-sm pills
├────────────────────────────────┤
│ ┌────────┐  ┌────────┐        │
│ │        │  │        │        │
│ │ 3:4    │  │ 3:4    │        │  2 col grid
│ │ image  │  │ image  │        │
│ │        │  │        │        │
│ └────────┘  └────────┘        │
│  Brand      Brand             │
│  Name...    Name...           │
│  900,000원  450,000원          │
│                                │
│ ┌────────┐  ┌────────┐        │
│ │        │  │        │        │
│   ... more cards ...          │
└────────────────────────────────┘
```

### 7b. Desktop Browsing State (1280px)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                    │  py-12
│                         taste-like                                 │  text-4xl bold, centered
│              럭셔리 아이템의 저렴한 대안을 찾아드립니다              │  text-base, centered
│                                                                    │  mb-8
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┬─────────┐ │  mb-5, max-w-2xl centered
│  │  럭셔리 브랜드 상품 URL을 붙여넣으세요 (예: ysl.com/...) │ 찾아보기││
│  └────────────────────────────────────────────────────┴─────────┘ │
│                  또는 아래에서 상품을 직접 탐색하세요                │  centered
├──────────────────────────────────────────────────────────────────┤
│   SAINT LAURENT     BOTTEGA VENETA     PRADA     BALENCIAGA        │  mb-4
│   ──────────────                                                   │
├──────────────────────────────────────────────────────────────────┤
│   [All]  [Bags]  [Shoes]  [Outerwear]  [Tops]  [Bottoms]  [Acc]   │  mb-6, flex-wrap
├──────────────────────────────────────────────────────────────────┤
│ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                           │
│ │      │  │      │  │      │  │      │                           │
│ │      │  │      │  │      │  │      │  4 col grid               │
│ │      │  │      │  │      │  │      │                           │
│ └──────┘  └──────┘  └──────┘  └──────┘                           │
│  Brand    Brand     Brand     Brand                               │
│  Name     Name      Name      Name                                │
│  Price    Price     Price     Price                               │
└──────────────────────────────────────────────────────────────────┘
```

### 7c. Mobile Results State (375px)

```
┌────────────────────────────────┐
│ ← 돌아가기           taste-like │  back-nav bar, py-4, border-b
├────────────────────────────────┤
│  원본 상품                      │  section label, text-xs uppercase
│ ┌────┬──────────────────────── ┐│
│ │    │ Saint Laurent          ││  SourceCard (unchanged)
│ │img │ Loulou Small           ││  card-side, bg-base-200
│ │    │ 2,450,000원            ││
│ └────┴───────────────────────┘ │  mb-8
├────────────────────────────────┤
│  추천 대안 (6개)                │  section label
│ ┌────────────────────────────┐ │
│ │                            │ │
│ │         3:4 image          │ │  1 col full-width on mobile
│ │                            │ │
│ └────────────────────────────┘ │
│  ZARA                          │  brand
│  Structured tote bag           │  name, line-clamp-2
│  59,900원  -97%               │  price + savings badge
│  유사도 73%                    │  similarity
│                                │
│ ┌────────────────────────────┐ │
│ │   ... next card ...        │ │
└────────────────────────────────┘
```

### 7d. Desktop Results State (1280px)

```
┌──────────────────────────────────────────────────────────────────┐
│ ← 돌아가기                                          taste-like     │  border-b mb-6
├──────────────────────────────────────────────────────────────────┤
│  원본 상품                                                         │
│ ┌─────────┬──────────────────────────────────────────────────── ┐ │
│ │         │ Saint Laurent                                        │ │  SourceCard, max-w-xl
│ │  image  │ Loulou Small Bag in Quilted Leather                 │ │
│ │ 160px   │ 2,450,000원                                         │ │
│ └─────────┴──────────────────────────────────────────────────── ┘ │
│                                                                    │
│  추천 대안 (6개)                                                   │
│ ┌───────┐  ┌───────┐  ┌───────┐                                  │
│ │       │  │       │  │       │                                  │
│ │ 3:4   │  │ 3:4   │  │ 3:4   │  3 col grid, sm:grid-cols-2    │
│ │ image │  │ image │  │ image │      lg:grid-cols-3             │
│ │       │  │       │  │       │                                  │
│ └───────┘  └───────┘  └───────┘                                  │
│  ZARA       COS        ZARA                                       │
│  Name...    Name...    Name...                                    │
│  59,900 -97% 89,000 -96% 45,900 -98%                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Component Changes Summary

| File | Action | What changes |
|------|--------|--------------|
| `src/app/page.tsx` | Modify | Add `urlInput`, `activeBrand` state; add `handleUrlSubmit`; restructure JSX into zones A–E; add results back-nav bar |
| `src/components/UrlSearchBar.tsx` | Create | URL input + submit, `join` pattern, loading spinner in button |
| `src/components/BrandNav.tsx` | Create | Underline-style brand switcher; `BRANDS` config array; `BrandComingSoon` exported from same file or separate |
| `src/components/BrandComingSoon.tsx` | Create | "Coming Soon" empty state — single div, no props needed except `brandLabel: string` |
| `src/components/CategoryFilter.tsx` | Modify | Change outer `div` to `flex-nowrap overflow-x-auto sm:flex-wrap scrollbar-hide` for mobile scrollability |
| `src/components/SourceCard.tsx` | Keep | No changes |
| `src/components/RecommendCard.tsx` | Keep | No changes |
| `src/components/SourceProductGrid.tsx` | Keep | No changes |
| `src/app/globals.css` | Modify | Add `.scrollbar-hide` utility (or use Tailwind plugin); add `@keyframes fadeIn` if needed |

### New type additions to `src/types/brand.ts`

```typescript
// Add after existing types:
export type BrandSlug = 'saint-laurent' | 'bottega-veneta' | 'prada' | 'balenciaga';

export interface NavBrand {
  slug: BrandSlug;
  label: string;
  available: boolean;
}
```

---

## 9. Implementation Notes and Edge Cases

### URL Search — Vercel 403 known issue

The URL search flow currently fails on Vercel (YSL 403 blocked). The UI should handle this gracefully without hiding the feature. Display the error message from the API as-is — the existing error state handles this correctly. No special UI treatment needed; the back button gets users out.

### Brand switching — API query param

The `/api/products/source` route currently returns all source (luxury) products regardless of brand. When `activeBrand` changes, the `fetchProducts` call should pass `?brand=saint-laurent` etc. The API does not yet filter by brand, but the param can be added now and the API can be updated later without UI changes.

```typescript
// In fetchProducts (page.tsx), add brand param:
if (activeBrand) params.set('brand', activeBrand);
```

### Loading state — which product is loading

When a user clicks a product card, the full grid shows a spinner overlay. Optionally, add `loadingProductId: string | null` state to highlight only the selected card. This improves perceived feedback on the product grid but is not required for v1.

### scrollbar-hide utility

DaisyUI v5 / Tailwind v4 do not include a `scrollbar-hide` utility by default. Two options:

1. Add to `globals.css`:
   ```css
   .scrollbar-hide {
     -ms-overflow-style: none;
     scrollbar-width: none;
   }
   .scrollbar-hide::-webkit-scrollbar {
     display: none;
   }
   ```

2. Install `tailwind-scrollbar-hide` plugin (adds 1 dep)

**Recommendation**: Option 1 — inline CSS in `globals.css`, no extra dependency.

### Back-nav bar in results mode

The minimal back-nav bar replaces Zones A/B/C/D entirely in results mode:

```jsx
{(status === 'results' || status === 'error') && (
  <div className="mb-6 flex items-center justify-between border-b border-base-300 pb-4">
    <button className="btn btn-ghost btn-sm" onClick={handleBack}>
      ← 돌아가기
    </button>
    <span className="text-sm font-bold tracking-tight">taste-like</span>
  </div>
)}
```

This provides persistent orientation without duplicating the full header.

### Accessibility

- `BrandNav` buttons: `aria-current="page"` on active brand (already specified above)
- Disabled brands in `BrandNav`: use `aria-disabled="true"` and `role="button"` instead of native `disabled` to keep them focusable but communicate their state to screen readers
- `UrlSearchBar`: associate label with input via `id`/`htmlFor` (visually hidden label is acceptable for the search bar context):
  ```jsx
  <label htmlFor="url-input" className="sr-only">상품 URL</label>
  <input id="url-input" ... />
  ```
- Category filter buttons: already use visible text labels — no change needed
- Color contrast: all text on `base-100` background passes WCAG AA at the defined theme values

---

*End of plan. Total new files: 3. Modified files: 3.*
