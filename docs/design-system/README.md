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

## 폴더 구조

```
src/components/
├── atoms/          ← 최소 UI 단위
├── molecules/      ← Atom 조합
├── organisms/      ← 페이지 섹션
└── index.ts        ← barrel export
```

## 목차

- [Tokens](./tokens.md) — 색상, 타이포, 스페이싱
- [Atoms](./atoms.md) — Badge, Button, Input, ProductImage, Skeleton, Typography
- [Molecules](./molecules.md) — ProductCard, SourceCard, SearchBar, BrandTab, GenderTab, CategoryPill, EmptyState
- [Organisms](./organisms.md) — BrandNav, CategoryFilter, GenderToggle, ProductGrid, RecommendSection, LoadingOverlay
- [Patterns](./patterns.md) — 공통 UX 패턴
