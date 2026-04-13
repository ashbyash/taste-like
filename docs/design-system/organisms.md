# Organisms

Molecules 조합. 페이지 섹션 단위. 비즈니스 로직은 포함하지 않고, props로 데이터를 받아 배치만 담당.

## BrandNav

브랜드 탭 가로 배열. BrandTab molecule 사용.

**파일**: `src/components/organisms/BrandNav.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| active | BrandSlug | — (필수) | 현재 선택 브랜드 |
| onSelect | `(brand: BrandSlug) => void` | — (필수) | 브랜드 변경 핸들러 |

### 동작

- `SOURCE_BRANDS`에서 브랜드 목록 가져옴
- available=false인 브랜드는 disabled 표시
- 사용 가능 브랜드가 1개 이하면 렌더링하지 않음

---

## CategoryFilter

카테고리 필 가로 스크롤 배열. CategoryPill molecule 사용.

**파일**: `src/components/organisms/CategoryFilter.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| selected | Category | — (필수) | 현재 선택 카테고리 |
| onSelect | `(category: Category) => void` | — (필수) | 카테고리 변경 핸들러 |

### 카테고리 목록

아우터, 상의, 하의, 가방, 신발

---

## GenderToggle

성별 탭 토글. GenderTab molecule 사용.

**파일**: `src/components/organisms/GenderToggle.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| selected | Gender | — (필수) | 현재 선택 성별 |
| onSelect | `(gender: Gender) => void` | — (필수) | 성별 변경 핸들러 |

---

## ProductGrid

상품 카드 반응형 그리드. ProductCard molecule + Skeleton atom 사용.

**파일**: `src/components/organisms/ProductGrid.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| variant | `'browse' \| 'recommend'` | — (필수) | 카드 모드 |
| products | `(Product \| RecommendedItem)[]` | — (필수) | 상품 배열 |
| onProductClick | `(id: string) => void` | — | 클릭 핸들러 (browse만) |
| loading | boolean | `false` | true면 Skeleton 표시 |
| skeletonCount | number | `8` | Skeleton 개수 |
| className | string | `''` | 추가 스타일 |

### 그리드 컬럼

| variant | mobile | tablet | desktop |
|---------|--------|--------|---------|
| browse | 2 cols | 3 cols | 4 cols |
| recommend | 2 cols | 2 cols | 3 cols |

---

## RecommendSection

추천 결과 전체 영역. SourceCard + ProductGrid 수직 배치.

**파일**: `src/components/organisms/RecommendSection.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| source | ScrapedProduct | — (필수) | 원본 상품 |
| recommendations | RecommendedItem[] | — (필수) | 추천 결과 |
| className | string | `''` | 추가 스타일 |

---

## LoadingOverlay

다단계 로딩 스피너. 시간에 따라 메시지 전환.

**파일**: `src/components/organisms/LoadingOverlay.tsx`

### Props

없음 (자체 내장 단계).

### 단계

1. 상품 정보를 가져오는 중... (0s)
2. 스타일을 분석하는 중... (1.5s)
3. 비슷한 아이템을 찾는 중... (4s)
4. 거의 다 됐어요... (7s)

`'use client'` 필수 — useState/useEffect 사용.
