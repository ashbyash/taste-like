# taste-like Design System Spec

**Date**: 2026-04-12
**Status**: Draft
**Scope**: 토큰 체계화 + Atomic Design 컴포넌트 재구성 + 마크다운 문서화

---

## 1. Overview

### 목적
taste-like 프로젝트의 UI 일관성 확보. 새 기능 추가 시 따라야 할 명확한 기준 제공.

### 범위
- 디자인 토큰 정의 (색상, 타이포그래피, 스페이싱, 레이아웃)
- 기존 9개 컴포넌트를 Atomic Design 계층으로 재구성
- 마크다운 기반 컴포넌트 문서화 (Storybook 없음)

### 범위 밖
- 다크 모드 (토큰 구조상 확장 가능하나 이번에 구현 안 함)
- Storybook / 별도 문서 사이트
- 새로운 페이지나 기능 추가

### 시각적 방향
기존 리디자인 스펙(`docs/specs/2026-03-23-visual-redesign-design.md`) 유지:
- Cool-neutral 팔레트 (slate/gray-blue)
- DM Serif Display (영문 제목) + Pretendard (본문/한글)
- 미니멀 럭셔리 큐레이션 무드 (Net-a-Porter, 29CM 참조)

---

## 2. Design Tokens

### 2-1. Color Tokens — 2-레이어 구조

DaisyUI "taste" 테마(Layer 1)는 유지하고, 시맨틱 토큰(Layer 2)을 추가한다.
컴포넌트에서는 **시맨틱 토큰만** 참조한다.

**Layer 1: DaisyUI Theme (기존 — 변경 없음)**

| Token | Value | 역할 |
|-------|-------|------|
| base-100 | #f8f9fb | 페이지 배경 |
| base-200 | #f1f5f9 | 보조 배경 |
| base-300 | #e2e8f0 | 보더, 구분선 |
| base-content | #1e293b | 기본 텍스트 |
| primary | #1e293b | 주요 액션 |
| secondary | #94a3b8 | 보조 텍스트 |
| accent | #6366f1 | 하이라이트 (인디고) |
| info | #64748b | 정보 텍스트 |
| success | #16a34a | 성공 |
| warning | #d97706 | 경고 |
| error | #dc2626 | 에러 |

**Layer 2: Semantic Tokens (신규)**

| Token | Maps To | 용도 |
|-------|---------|------|
| --color-text-primary | base-content | 본문 텍스트 |
| --color-text-secondary | secondary | 보조 텍스트, 브랜드명 |
| --color-text-muted | info | 힌트, 비활성 텍스트 |
| --color-text-brand | primary | 브랜드 강조 |
| --color-bg-page | base-100 | 페이지 배경 |
| --color-bg-card | #ffffff | 카드 배경 |
| --color-bg-hover | base-200 | 호버 상태 |
| --color-border-default | base-300 | 기본 보더 |
| --color-accent-savings | accent | 절약률 뱃지 |
| --color-accent-similarity | accent at 60% opacity | 유사도 텍스트 |

### 2-2. Typography Tokens

| Token | Class | Size | Weight | Font | 용도 |
|-------|-------|------|--------|------|------|
| display | text-display | text-3xl / sm:text-4xl | 400 | DM Serif Display | 페이지 타이틀 |
| heading | text-heading | text-lg / sm:text-xl | 600 | Pretendard | 섹션 제목 |
| body | text-body | text-sm / sm:text-base | 400 | Pretendard | 본문, 가격 |
| caption | text-caption | text-xs | 500 | Pretendard | 카테고리, 유사도 |
| label | text-label | text-[11px] | 400 | Pretendard | 브랜드명 (tracking-wider) |

### 2-3. Spacing Tokens

8px 그리드 기반. Tailwind 네이티브 클래스 사용, 시맨틱 이름으로 문서화.

| Token | Tailwind | Value |
|-------|----------|-------|
| xs | gap-1, p-1 | 4px |
| sm | gap-2, p-2 | 8px |
| md | gap-4, p-4 | 16px |
| lg | gap-6, p-6 | 24px |
| xl | gap-8, p-8 | 32px |
| 2xl | gap-12, p-12 | 48px |

### 2-4. Layout Tokens

| Token | Value | 용도 |
|-------|-------|------|
| --content-max-width | 1024px (max-w-5xl) | 콘텐츠 최대 폭 |
| --card-radius | 4px (rounded) | 카드, 이미지 모서리 |
| --button-radius | 9999px (rounded-full) | 필 버튼 모서리 |
| --grid-cols-mobile | 2 | < 640px |
| --grid-cols-tablet | 3 | 640px+ |
| --grid-cols-desktop | 4 | 1024px+ |

### 2-5. 토큰 구현 위치

`globals.css` 안에서 기존 DaisyUI 테마 아래에 추가:

```css
/* ── Semantic Color Tokens ── */
:root {
  --color-text-primary: var(--color-base-content);
  --color-text-secondary: var(--color-secondary);
  --color-bg-page: var(--color-base-100);
  --color-accent-savings: var(--color-accent);
  /* ... */
}

/* ── Typography Utilities ── */
@utility text-display { /* DM Serif Display, text-3xl/4xl */ }
@utility text-heading { /* Pretendard, text-lg/xl, font-semibold */ }
@utility text-body { /* Pretendard, text-sm/base */ }
@utility text-caption { /* Pretendard, text-xs, font-medium */ }
@utility text-label { /* Pretendard, text-[11px], tracking-wider */ }
```

---

## 3. Atomic Design Structure

### 3-1. 폴더 구조

```
src/components/
├── atoms/
│   ├── Badge.tsx
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Image.tsx
│   ├── Skeleton.tsx
│   └── Typography.tsx
├── molecules/
│   ├── ProductCard.tsx
│   ├── SourceCard.tsx
│   ├── SearchBar.tsx
│   ├── CategoryPill.tsx
│   ├── BrandTab.tsx
│   ├── GenderTab.tsx
│   └── EmptyState.tsx
├── organisms/
│   ├── BrandNav.tsx
│   ├── CategoryFilter.tsx
│   ├── GenderToggle.tsx
│   ├── ProductGrid.tsx
│   ├── RecommendSection.tsx
│   └── LoadingOverlay.tsx
└── index.ts                ← barrel export
```

### 3-2. 의존성 규칙

```
pages → organisms → molecules → atoms → tokens
```

- **atoms**: 다른 컴포넌트 import 금지. 토큰만 사용.
- **molecules**: atoms만 import 가능.
- **organisms**: atoms + molecules import 가능.
- **pages**: 모든 레벨 import 가능 (주로 organisms).
- 같은 레벨 간 import 허용. 순환 참조 금지.

### 3-3. 컴포넌트 공통 계약

모든 컴포넌트는 다음을 따른다:
1. Props interface를 파일 상단에 선언
2. `variant`로 시각적 변형 제어
3. `className?: string` prop으로 외부 스타일 확장 허용
4. 시맨틱 토큰만 사용 (raw hex 값 금지)

### 3-4. 마이그레이션 매핑

| 기존 | → 신규 | 변경 |
|------|--------|------|
| RecommendCard.tsx | molecules/ProductCard.tsx | 범용화: variant "browse" \| "recommend" |
| SourceCard.tsx | molecules/SourceCard.tsx | atoms 조합으로 리팩토링 |
| UrlSearchBar.tsx | molecules/SearchBar.tsx | Input + Button atoms 사용 |
| BrandNav.tsx | organisms/BrandNav.tsx | BrandTab molecule 배열로 분리 |
| CategoryFilter.tsx | organisms/CategoryFilter.tsx | CategoryPill molecule 배열로 분리 |
| GenderToggle.tsx | organisms/GenderToggle.tsx | GenderTab molecule 사용 |
| SourceProductGrid.tsx | organisms/ProductGrid.tsx | ProductCard molecule 그리드 |
| LoadingProgress.tsx | organisms/LoadingOverlay.tsx | Skeleton atom + 단계별 메시지 |
| BrandComingSoon.tsx | molecules/EmptyState.tsx | 범용화: variant "coming-soon" \| "no-results" \| "error" |

---

## 4. Component Specs

### 4-1. Atoms

#### Badge
```typescript
interface BadgeProps {
  variant: 'savings' | 'category' | 'similarity';
  children: React.ReactNode;
  className?: string;
}
```
- `savings`: accent 배경, 흰 텍스트 ("-96%")
- `category`: base-200 배경, base-content 텍스트 ("아우터")
- `similarity`: 배경 없음, accent 텍스트 ("유사도 94%")

#### Button
```typescript
interface ButtonProps {
  variant: 'primary' | 'ghost' | 'pill';
  size: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}
```
- `primary`: 검정 배경, 흰 텍스트 (검색 제출)
- `ghost`: 투명, hover 시 base-200 (뒤로가기)
- `pill`: rounded-full, active 시 primary 배경 (카테고리)

#### Input
```typescript
interface InputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  className?: string;
}
```

#### Image
```typescript
interface ImageProps {
  src: string;
  alt: string;
  aspect?: '3/4' | '1/1' | '4/3';  // default: '3/4'
  radius?: 'sm' | 'none';           // default: 'sm' (4px)
  loading?: 'lazy' | 'eager';       // default: 'lazy'
  className?: string;
}
```
- Next.js Image 래핑 + 프록시 URL 자동 적용
- 로딩 실패 시 fallback placeholder 표시

#### Skeleton
```typescript
interface SkeletonProps {
  variant: 'card' | 'text' | 'image';
  className?: string;
}
```
- `card`: 이미지(3:4) + 텍스트 2줄 형태
- `text`: 한 줄 텍스트 바
- `image`: 사각형 이미지 플레이스홀더

#### Typography
```typescript
interface TypographyProps {
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  variant: 'display' | 'heading' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'muted' | 'accent';
  align?: 'left' | 'center';
  truncate?: boolean | number;  // true=1줄, number=N줄 line-clamp
  children: React.ReactNode;
  className?: string;
}
```

### 4-2. Molecules

#### ProductCard (핵심 컴포넌트)
```typescript
interface ProductCardProps {
  variant: 'browse' | 'recommend';
  product: {
    name: string;
    brand: string;
    price: number;
    imageUrl: string;
    productUrl: string;
  };
  savings?: number;        // recommend only
  similarity?: number;     // recommend only
  onClick?: () => void;
  className?: string;
}
```
- `browse`: Image + Typography(label: 브랜드) + Typography(body: 이름, 2줄) + Typography(body: 가격)
- `recommend`: browse + Badge(savings) + Badge(similarity)

#### SourceCard
```typescript
interface SourceCardProps {
  product: { name: string; brand: string; price: number; imageUrl: string };
}
```

#### SearchBar
```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  placeholder?: string;
}
```

#### BrandTab / GenderTab / CategoryPill
```typescript
interface TabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}
```
- BrandTab: Typography(label) + 밑줄 인디케이터
- GenderTab: Typography(caption) + 밑줄 인디케이터
- CategoryPill: Button(pill) + active 배경 전환

#### EmptyState
```typescript
interface EmptyStateProps {
  variant: 'coming-soon' | 'no-results' | 'error';
  message?: string;
}
```

### 4-3. Organisms

#### BrandNav
```typescript
interface BrandNavProps {
  brands: { slug: string; label: string; available: boolean }[];
  active: string;
  onSelect: (slug: string) => void;
}
```

#### CategoryFilter
```typescript
interface CategoryFilterProps {
  categories: { value: string; label: string }[];
  active: string;
  onSelect: (value: string) => void;
}
```

#### GenderToggle
```typescript
interface GenderToggleProps {
  options: { value: string; label: string }[];
  active: string;
  onSelect: (value: string) => void;
}
```

#### ProductGrid
```typescript
interface ProductGridProps {
  products: Product[];
  variant: 'browse' | 'recommend';
  onProductClick?: (product: Product) => void;
  loading?: boolean;
  skeletonCount?: number;  // default: 8
}
```
- `loading=true`이면 Skeleton(card) × skeletonCount 표시

#### RecommendSection
```typescript
interface RecommendSectionProps {
  source: Product;
  recommendations: RecommendedItem[];
  onBack: () => void;
}
```

#### LoadingOverlay
```typescript
interface LoadingOverlayProps {
  steps: string[];
  currentStep: number;
}
```

---

## 5. Documentation

### 5-1. 문서 위치

```
docs/design-system/
├── README.md       ← 개요, 원칙, 퀵스타트, 목차
├── tokens.md       ← 색상, 타이포, 스페이싱 전체 레퍼런스
├── atoms.md        ← Atom 컴포넌트 문서
├── molecules.md    ← Molecule 컴포넌트 문서
├── organisms.md    ← Organism 컴포넌트 문서
└── patterns.md     ← 로딩, 에러, 빈 상태, 반응형 패턴
```

### 5-2. 컴포넌트 문서 형식

각 컴포넌트는 통일된 포맷으로 문서화:

```
## ComponentName

한 줄 설명.

**파일**: `src/components/{layer}/ComponentName.tsx`

### Props
| Prop | Type | Default | 설명 |

### Variants
variant별 설명 + 시각적 차이점.

### 사용 예시
```tsx (코드 블록)```

### 토큰 사용
| 요소 | 토큰 |
```

### 5-3. patterns.md 포함 내용

- 로딩 패턴 (그리드 스켈레톤, 전체 화면 로딩)
- 에러 패턴 (EmptyState error + 재시도)
- 빈 상태 패턴 (coming-soon, no-results)
- 반응형 패턴 (breakpoint별 그리드)
- 가격 표시 패턴 (formatPrice 유틸)

---

## 6. Migration Strategy

### 순서

1. **토큰 정의** — globals.css에 시맨틱 토큰 + @utility 타이포 추가
2. **Atoms 생성** — 6개 atom 컴포넌트 작성
3. **Molecules 마이그레이션** — 기존 컴포넌트를 atoms 기반으로 재작성
4. **Organisms 마이그레이션** — molecules 기반으로 재작성
5. **page.tsx 업데이트** — import 경로 변경, barrel export 사용
6. **기존 컴포넌트 삭제** — src/components/ 루트의 old 파일 제거
7. **문서 작성** — docs/design-system/ 6개 파일
8. **빌드 검증** — `npm run build` 통과 확인

### 기존 기능 보존

- 모든 Props/이벤트 핸들러는 기존과 동일하게 유지
- page.tsx의 상태 관리 로직은 변경하지 않음
- API 호출 로직 변경 없음

---

## 7. Constraints

- DaisyUI 테마는 유지한다 (제거하지 않음)
- 새로운 npm 패키지 추가 없음
- 기존 UI의 시각적 결과물은 동일하게 유지 (리팩토링, 리디자인 아님)
- formatPrice() 중복 정리는 이 스펙 범위에 포함하지 않음 (별도 태스크)
