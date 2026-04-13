# Design Tokens

구현 위치: `src/app/globals.css`

## Color Tokens

### Layer 2: Semantic (컴포넌트에서 사용)

| Token | Maps To | 용도 |
|-------|---------|------|
| `--color-text-primary` | base-content (#1e293b) | 본문 텍스트 |
| `--color-text-secondary` | secondary (#94a3b8) | 보조 텍스트, 브랜드명 |
| `--color-text-muted` | info (#64748b) | 힌트, 비활성 텍스트 |
| `--color-text-brand` | primary (#1e293b) | 브랜드 강조 |
| `--color-bg-page` | base-100 (#f8f9fb) | 페이지 배경 |
| `--color-bg-card` | #ffffff | 카드 배경 |
| `--color-bg-hover` | base-200 (#f1f5f9) | 호버 상태 |
| `--color-border-default` | base-300 (#e2e8f0) | 기본 보더 |
| `--color-accent-savings` | accent (#6366f1) | 절약률 뱃지 |
| `--color-accent-similarity` | accent 60% opacity | 유사도 텍스트 |

### Layer 1: DaisyUI Theme (직접 사용 금지)

컴포넌트에서 직접 참조하지 않는다. 시맨틱 토큰이 내부적으로 참조.

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

## Typography Tokens

| Token | Class | Size | Weight | Font | 용도 |
|-------|-------|------|--------|------|------|
| display | `text-display` | 3xl / sm:4xl | 400 | DM Serif Display | 페이지 타이틀 |
| heading | `text-heading` | lg / sm:xl | 600 | Pretendard | 섹션 제목 |
| body | `text-body` | sm / sm:base | 400 | Pretendard | 본문, 가격 |
| caption | `text-caption` | xs | 500 | Pretendard | 카테고리, 유사도 |
| label | `text-label` | 11px | 400 | Pretendard | 브랜드명 (tracking-wider) |

## Spacing

8px 그리드 기반. Tailwind 네이티브 클래스 사용.

| Token | Tailwind | Value |
|-------|----------|-------|
| xs | gap-1, p-1 | 4px |
| sm | gap-2, p-2 | 8px |
| md | gap-4, p-4 | 16px |
| lg | gap-6, p-6 | 24px |
| xl | gap-8, p-8 | 32px |
| 2xl | gap-12, p-12 | 48px |

## Layout

| Token | Value | 용도 |
|-------|-------|------|
| max-w-4xl | 896px | 콘텐츠 최대 폭 |
| rounded | 4px | 카드, 이미지 모서리 |
| rounded-full | 9999px | 필 버튼 모서리 |
| grid-cols-2 | mobile | < 640px |
| sm:grid-cols-3 | tablet | 640px+ |
| lg:grid-cols-4 | desktop | 1024px+ |
