# taste-like

**럭셔리 브랜드 아이템의 저렴한 대안을 AI로 찾아주는 서비스**

"생로랑 맛 자라" — 디자인은 비슷하되 가격은 1/10. 럭셔리 브랜드 상품 URL을 입력하면, AI가 SPA/저가 브랜드에서 시각적으로 유사한 아이템을 추천합니다.

🔗 **라이브 데모**: [taste-like.vercel.app](https://taste-like.vercel.app)

<!-- 스크린샷 -->

---

## 작동 방식

### Online Pipeline (사용자 요청)

```
URL 입력 → Playwright 스크래핑 → 상품 이미지 추출
  → HuggingFace Embedding API (Marqo-FashionSigLIP, 768-dim)
  → Supabase pgvector cosine similarity 검색
  → 카테고리 + 가격 필터링 → 추천 결과
```

### Offline Pipeline (상품 DB 구축)

```
GitHub Actions 주간 크롤 → Playwright/API 크롤러
  → 상품 데이터 + 이미지 수집
  → HuggingFace Space 배치 임베딩
  → Supabase products 테이블 저장
```

핵심은 **fashion-specific 임베딩**입니다. 범용 이미지 임베딩 대신 [Marqo-FashionSigLIP](https://huggingface.co/Marqo/marqo-fashionSigLIP)을 사용하여 패션 아이템의 시각적 유사도를 정확하게 측정합니다.

---

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + DaisyUI (커스텀 테마) |
| DB | Supabase (PostgreSQL + pgvector) |
| Embedding | Marqo-FashionSigLIP (768-dim, HuggingFace Spaces) |
| Scraping | Playwright |
| Deployment | Vercel |
| CI/CD | GitHub Actions (주간 크롤 자동화) |
| Testing | Vitest |

---

## 지원 브랜드

| 입력 (럭셔리) | 추천 (SPA) |
|---------------|-----------|
| Saint Laurent | ZARA |
| Miu Miu | COS |
| The Row | UNIQLO |
| Lemaire | ARKET |
| | Massimo Dutti |

---

## 프로젝트 구조

```
src/
├── app/                # Next.js App Router 페이지 + API 라우트
├── components/
│   ├── atoms/          # 버튼, 입력, 이미지 등 기본 요소
│   ├── molecules/      # 상품 카드, 검색 폼 등 조합 컴포넌트
│   ├── organisms/      # 추천 결과 그리드, 헤더 등 섹션 단위
│   └── seo/            # SEO 관련 컴포넌트
├── lib/
│   ├── embedding/      # HuggingFace Embedding 클라이언트
│   ├── recommend/      # 추천 파이프라인 (필터링, 랭킹)
│   ├── scrapers/       # 브랜드별 크롤러 (Playwright/API)
│   └── supabase/       # Supabase 클라이언트 + 쿼리
├── types/              # 공유 TypeScript 타입
scripts/
├── crawl.ts            # 통합 크롤 CLI
├── batch-embed.ts      # 배치 임베딩
└── batch-describe.ts   # 배치 상품 설명 생성
```

---

## Getting Started

### 사전 요구사항

- Node.js 20+
- npm
- Supabase 프로젝트 (pgvector 확장 활성화)
- HuggingFace Space (임베딩용)

### 설치

```bash
git clone https://github.com/ashbyash/taste-like.git
cd taste-like
npm install
```

### 환경 변수

`.env.local.example`을 복사하고 값을 채워주세요:

```bash
cp .env.local.example .env.local
```

주요 환경 변수:

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `HF_SPACE_URL` | HuggingFace Space 임베딩 서버 URL |
| `OPENAI_API_KEY` | 상품 설명 생성용 (batch-describe) |

### 개발 서버

```bash
npm run dev
```

### 테스트

```bash
npm test
```

---

## License

MIT
