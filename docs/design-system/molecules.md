# Molecules

Atom 조합. 하나의 기능 단위.

## ProductCard

상품을 카드 형태로 표시. 브라우징/추천 두 모드 지원. **디자인 시스템의 핵심 컴포넌트.**

**파일**: `src/components/molecules/ProductCard.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| variant | `'browse' \| 'recommend'` | — (필수) | 표시 모드 |
| product | `{ name, brand, price, imageUrl, productUrl, category? }` | — (필수) | 상품 데이터 |
| savings | number | — | 절약률 % (recommend만) |
| similarity | number | — | 유사도 % (recommend만) |
| onClick | function | — | 클릭 핸들러 (browse만) |
| className | string | `''` | 추가 스타일 |

### Variants

**browse** — 브라우징 모드
- ProductImage(3:4) + 브랜드 label + 이름(2줄) + 가격
- 클릭 시 onClick (추천 요청)
- `<button>` 렌더링

**recommend** — 추천 결과
- browse + 절약률 Badge(savings) + 유사도 텍스트
- 클릭 시 외부 상품 페이지 이동 + GA 이벤트
- `<a target="_blank">` 렌더링

### 토큰 사용

| 요소 | 토큰 |
|------|------|
| 브랜드명 | text-label, --color-text-secondary |
| 상품명 | text-sm font-medium, --color-text-primary |
| 가격 | text-body font-semibold |
| 절약률 | Badge(savings) |
| 유사도 | text-xs, --color-accent-similarity |

---

## SourceCard

가로형 원본 상품 배너. 추천 결과 상단에 표시.

**파일**: `src/components/molecules/SourceCard.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| product | `{ name, brand, price, imageUrl, productUrl }` | — (필수) | 상품 데이터 |
| className | string | `''` | 추가 스타일 |

---

## SearchBar

URL 입력 + 제출 버튼 조합. Input + Button atoms 사용.

**파일**: `src/components/molecules/SearchBar.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| value | string | — (필수) | URL 입력값 |
| onChange | `(value: string) => void` | — (필수) | 변경 핸들러 |
| onSubmit | `(e: FormEvent) => void` | — (필수) | 제출 핸들러 |
| loading | boolean | `false` | 로딩 상태 |
| placeholder | string | 기본 메시지 | 플레이스홀더 |
| className | string | `''` | 추가 스타일 |

---

## BrandTab

단일 브랜드 네비게이션 항목. 밑줄 인디케이터.

**파일**: `src/components/molecules/BrandTab.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| label | string | — (필수) | 브랜드명 |
| active | boolean | — (필수) | 활성 상태 |
| disabled | boolean | `false` | 비활성 |
| onClick | function | — (필수) | 클릭 핸들러 |

---

## GenderTab

단일 성별 토글 항목. 밑줄 인디케이터.

**파일**: `src/components/molecules/GenderTab.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| label | string | — (필수) | 라벨 (여성/남성) |
| active | boolean | — (필수) | 활성 상태 |
| onClick | function | — (필수) | 클릭 핸들러 |

---

## CategoryPill

단일 카테고리 필터 버튼. rounded-full pill 스타일.

**파일**: `src/components/molecules/CategoryPill.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| label | string | — (필수) | 카테고리명 |
| active | boolean | — (필수) | 활성 상태 |
| onClick | function | — (필수) | 클릭 핸들러 |

---

## EmptyState

빈 상태 표시. Coming Soon, 검색 결과 없음, 에러.

**파일**: `src/components/molecules/EmptyState.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| variant | `'coming-soon' \| 'no-results' \| 'error'` | — (필수) | 상태 종류 |
| message | string | variant별 기본값 | 커스텀 메시지 |
| brandLabel | string | — | 브랜드명 (coming-soon용) |
| className | string | `''` | 추가 스타일 |
