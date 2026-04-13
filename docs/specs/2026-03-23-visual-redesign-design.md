# Visual Redesign — Design Spec

> Project: [[taste-like]]

## Overview

taste-like("생로랑 맛 자라 찾기") 서비스의 비주얼 디자인 리디자인.
현재 DaisyUI 기본 테마 기반의 밋밋한 "개발자가 만든" 느낌에서 벗어나,
패션 감도가 높은 유저가 신뢰할 수 있는 하이엔드 큐레이션 톤으로 전환한다.

## Scope

- **포함**: 컬러 팔레트, 타이포그래피, 카드 스타일, 네비게이션 UI, 한글화, 전체 비주얼 톤
- **미포함**: UX 흐름, 기능 구조, 라우팅, API, 데이터 모델 (현행 유지)

## Design Decisions

### 1. Mood & Direction

- **하이엔드 큐레이션** — Net-a-Porter, Farfetch, 29CM 참고
- **라이트 모드 기본**, 다크 모드는 추후 추가 가능한 구조
- 다크 톤 요소를 억지로 섞지 않고, 라이트 베이스에서 고급감을 냄

### 2. Typography

| Role | Font | Notes |
|------|------|-------|
| 영문 헤딩 | DM Serif Display | 세리프, 고급 큐레이션 톤 |
| 한글 전체 + 영문 본문 | Pretendard Variable | 모던 산세리프, 가독성 최고 |

- 로딩: Google Fonts (DM Serif Display) + Pretendard CDN (dynamic subset)
- 현재 Geist Sans 제거

### 3. Color Palette — Cool Neutral

| Token | Hex | Usage |
|-------|-----|-------|
| `base-bg` | `#f8f9fb` | 페이지 배경 |
| `base-surface` | `#f1f5f9` | 카드/섹션 배경 (필요시) |
| `base-border` | `#e2e8f0` | 보더, 디바이더 |
| `text-muted` | `#94a3b8` | 보조 텍스트, 비활성 상태 |
| `text-subtle` | `#64748b` | 카테고리 버튼, 중간 계층 텍스트 |
| `text-primary` | `#1e293b` | 주 텍스트, 활성 상태 |
| `accent` | `#6366f1` | 절약률 퍼센트, 강조 |
| `card-placeholder` | `#eef1f5` | 이미지 플레이스홀더 |
| `card-placeholder-text` | `#c1c9d6` | 플레이스홀더 내 텍스트 |

- 현재 웜 스톤 계열(#78716c, #1c1917, #b91c1c) → 쿨 슬레이트 계열로 전환
- 액센트: 빨강(#b91c1c) → 인디고(#6366f1)

### 4. Card Style — Borderless

- 그림자, 테두리 없음
- 이미지와 텍스트만으로 구성
- 호버: `opacity: 0.9` (이미지)
- 이미지 비율: `aspect-ratio: 3/4` 유지
- 이미지 border-radius: `4px`

### 5. Navigation Components

#### Brand Nav (브랜드 탭)
- 스타일: 언더라인 (현행 패턴 유지)
- 비활성: `color: #94a3b8`, 보더 없음
- 활성: `color: #1e293b`, `border-bottom: 2px solid #1e293b`
- 호버: `color: #64748b`

#### Category Filter (카테고리 필터)
- 스타일: pill 버튼 (라운드, `border-radius: 20px`)
- 비활성: `border: 1px solid #e2e8f0`, `color: #64748b`
- 활성: `background: #1e293b`, `color: #fff`
- 호버(비활성): `border-color: #94a3b8`, `color: #1e293b`
- **현행 DaisyUI btn-sm → 커스텀 pill 버튼으로 교체**

#### Gender Toggle (성별 토글)
- 스타일: 언더라인 (Brand Nav와 동일 패턴)
- 비활성: `color: #94a3b8`
- 활성: `color: #1e293b`, `border-bottom: 2px solid #1e293b`

### 6. Savings Display — Source Banner + Card Percentage

#### Results View 구조
1. **원본 상품 배너** (상단, 1회 표시)
   - 좌: 원본 이미지 (100px)
   - 우: "원본 상품" 라벨 + 상품명(DM Serif Display) + 브랜드명 + 가격
   - 스타일: `background: #fff`, `border: 1px solid #e2e8f0`, `border-radius: 8px`

2. **추천 대안 그리드** (보더리스 카드)
   - 라벨: "추천 대안" + "N개의 대안을 찾았어요"
   - 각 카드: 이미지 + 브랜드명 + 상품명 + 가격 + 절약률(인디고) + 유사도
   - 절약률: `-96%` (인디고 #6366f1, font-weight: 600)
   - 유사도: `유사도 92%` (muted 색상)

### 7. Localization (한글화)

| Before | After |
|--------|-------|
| TASTE LIKE (로고) | 생로랑 맛 자라 찾기 |
| Find your style, not the price tag | 같은 맛, 다른 가격 |
| WOMEN / MEN | 여성 / 남성 |
| Outerwear, Tops, Bottoms, Bags, Shoes | 아우터, 상의, 하의, 가방, 신발 |
| Search (버튼) | 찾기 |
| Original | 원본 상품 |
| Alternatives | 추천 대안 |
| "6 items found" | "6개의 대안을 찾았어요" |
| "92% match" | "유사도 92%" |

- 브랜드명은 영문 유지 (Saint Laurent, ZARA, COS 등)
- 상품명은 크롤된 데이터 그대로 표시 (영문/한글 혼재 가능)

### 8. Header

- 로고: `font-weight: 700`, `font-size: 22px`, `letter-spacing: -0.5px` (Pretendard)
- 태그라인: `font-size: 13px`, `color: #94a3b8`
- 하단 구분선: `1px solid #e2e8f0`

### 9. Search Bar

- 스타일: `border: 1px solid #e2e8f0`, `border-radius: 8px`, 배경 `#fff`
- 포커스: `border-color: #94a3b8`
- 버튼: `background: #1e293b`, `color: #fff`, 텍스트 "찾기"
- placeholder: "럭셔리 브랜드 상품 URL을 붙여넣으세요"
- 최대 너비: 560px, 가운데 정렬

### 10. Grid Layout

| View | Columns | Gap |
|------|---------|-----|
| Browse (데스크탑) | 4 | 24px |
| Browse (모바일) | 2 | 현행 유지 |
| Results 대안 (데스크탑) | 3 | 24px |
| Results 대안 (모바일) | 2 | 현행 유지 |

- 최대 너비: 960px (현행 max-w-5xl ≈ 1024px에서 약간 축소)

## Implementation Notes

### DaisyUI Theme Migration

현재 `globals.css`의 DaisyUI `@plugin "daisyui/theme"` 설정을 쿨 뉴트럴 팔레트로 교체:

```
--color-base-100: #f8f9fb    (was #ffffff)
--color-base-200: #f1f5f9    (was #f5f5f4)
--color-base-300: #e2e8f0    (was #e7e5e4)
--color-base-content: #1e293b (was #1c1917)
--color-primary: #1e293b      (was #1c1917)
--color-secondary: #94a3b8    (was #78716c)
--color-accent: #6366f1       (was #b91c1c)
```

### Font Loading

```html
<!-- DM Serif Display -->
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet">

<!-- Pretendard Variable (dynamic subset) -->
<link rel="stylesheet" as="style" crossorigin
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
```

### Files to Modify

| File | Change |
|------|--------|
| `src/app/globals.css` | DaisyUI theme 값 교체, Geist 관련 제거 |
| `src/app/layout.tsx` | Geist 폰트 제거, Pretendard + DM Serif Display 로딩 |
| `src/app/page.tsx` | 한글 라벨, 로고/태그라인 텍스트 교체 |
| `src/components/UrlSearchBar.tsx` | placeholder 한글화, 버튼 텍스트, 스타일 |
| `src/components/GenderToggle.tsx` | 여성/남성 라벨, 쿨 뉴트럴 색상 |
| `src/components/BrandNav.tsx` | 쿨 뉴트럴 색상 적용 |
| `src/components/CategoryFilter.tsx` | pill 버튼 스타일, 한글 카테고리명 |
| `src/components/SourceCard.tsx` | 원본 배너 스타일, "원본 상품" 라벨 |
| `src/components/RecommendCard.tsx` | 보더리스, 절약률 인디고, "유사도" 라벨 |
| `src/components/SourceProductGrid.tsx` | 보더리스 카드, 색상 |
| `src/components/LoadingProgress.tsx` | 쿨 뉴트럴 색상 |
| `src/components/BrandComingSoon.tsx` | 색상 |

### SEO 컴포넌트

SEO 페이지(`/style/[combo]/`) 컴포넌트도 동일한 디자인 토큰 적용:
- `StylePairCard.tsx`, `CategoryNav.tsx`, `BrandFilterGrid.tsx`, `CtaBanner.tsx`

### Dark Mode (향후)

- DaisyUI 다크 테마를 별도로 정의하되, 현재 구현하지 않음
- 컴포넌트에서 raw hex 대신 DaisyUI 시맨틱 토큰 사용 → 다크 모드 추가 시 토큰 값만 교체

## Mockup Reference

- 브라우저 목업: `.superpowers/brainstorm/19676-1774234053/full-mockup-v2.html`
- 컬러 팔레트 비교: `.superpowers/brainstorm/19676-1774234053/color-palette.html`
- 절약률 표시 비교: `.superpowers/brainstorm/19676-1774234053/savings-display.html`
