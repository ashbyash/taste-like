# Patterns

여러 컴포넌트에 걸치는 공통 UX 패턴.

## 로딩 패턴

### 그리드 스켈레톤

ProductGrid에 `loading=true` 전달. Skeleton(card) 자동 표시.

```tsx
<ProductGrid variant="browse" products={[]} loading={true} />
```

### 전체 화면 로딩

추천 요청 시 LoadingOverlay 사용. 단계별 메시지 자동 전환.

```tsx
{status === 'loading' && <LoadingOverlay />}
```

## 에러 패턴

현재 page.tsx에서 직접 처리. EmptyState(error) 활용 가능.

```tsx
<EmptyState variant="error" message="네트워크 오류가 발생했습니다" />
```

## 빈 상태 패턴

### 브랜드 미지원

```tsx
<EmptyState variant="coming-soon" brandLabel="Bottega Veneta" />
```

### 검색 결과 없음

ProductGrid가 빈 배열 수신 시 자동으로 EmptyState(no-results) 표시.

## 반응형 패턴

| Breakpoint | Grid | 카드 크기 |
|------------|------|----------|
| mobile (< 640px) | 2 cols | ~170px |
| tablet (640px+) | 3 cols | ~200px |
| desktop (1024px+) | 4 cols | ~240px |

모든 레이아웃은 mobile-first. `sm:`, `lg:` 접두사로 확장.

## 가격 표시 패턴

`formatPrice()` 유틸 사용 (`src/lib/format.ts`).

```tsx
import { formatPrice } from '@/lib/format';
formatPrice(129000);  // "129,000원"
```

## 이미지 패턴

- 기본 비율: 3:4 (패션 상품 표준)
- lazy loading 기본 적용
- ProductImage atom으로 통일
- Next.js `remotePatterns`을 통한 프록시 경유 필수

## 네비게이션 패턴

- 탭형: 밑줄 인디케이터 (BrandTab, GenderTab)
- 필형: rounded-full 배경 전환 (CategoryPill)
- 활성 상태: `active` prop boolean으로 제어
