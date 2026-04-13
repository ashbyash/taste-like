# PRD-001: MVP URL 기반 유사 아이템 추천

> Project: [[taste-like]]

## 메타 정보


| 항목     | 내용                   |
| ------ | -------------------- |
| PRD ID | PRD-001              |
| 제목     | MVP URL 기반 유사 아이템 추천 |
| 상태     | Draft                |
| 작성일    | 2026-02-26           |
| 버전     | 0.1                  |
| 관련 PRD | 없음 (최초 PRD)          |


### 버전 히스토리


| 버전  | 날짜         | 변경 내용 |
| --- | ---------- | ----- |
| 0.3 | 2026-02-26 | PoC 스코프 추가 (Saint Laurent → ZARA/COS) |
| 0.2 | 2026-02-26 | 크롤링 전략 변경 (자체몰+플랫폼+API 3단계), 브랜드명 수정 |
| 0.1 | 2026-02-26 | 초안 작성 |


---

## 1. 개요

### 한 줄 요약

럭셔리 브랜드 상품 URL을 입력하면 디자인이 유사한 저가 대안 아이템을 추천해주는 서비스

### 핵심 가치

- "생로랑 맛 자라" — 디자인/실루엣은 유사하되 가격은 1/5~1/10
- 유저가 좋아하는 디자인을 포기하지 않으면서 합리적으로 쇼핑할 수 있게

### 타겟 유저

- 럭셔리/컨템포러리 브랜드의 디자인은 좋아하지만 가격이 부담되는 2030 패션 관심층
- 인스타/핀터레스트에서 럭셔리 아이템을 발견하고 "이거 비슷한 거 싼 거 없나?" 하는 사람들

---

## 2. 문제 & 기회

### 문제

- 럭셔리 브랜드 아이템을 보고 "비슷한 거 싼 거" 찾으려면 직접 SPA 브랜드를 하나하나 돌아다녀야 함
- "생로랑 맛 자라"같은 표현은 이미 유행 → 수요는 있지만 체계적인 솔루션이 없음
- 기존 가격비교 서비스는 "같은 상품"의 최저가를 찾아주는 것이지, "비슷한 디자인의 저가 대안"을 찾아주는 게 아님

### 기회

- 이미지 임베딩 + AI 기술로 "디자인 유사도" 기반 추천이 기술적으로 가능해짐
- SPA 브랜드들이 시즌마다 럭셔리 디자인을 참고하는 건 공공연한 사실
- 어필리에이트 링크를 통한 수익화 가능성

---

## 3. 유저 플로우

### 메인 플로우 (Happy Path)

```
[랜딩 페이지]
  유저가 URL 입력란에 럭셔리 브랜드 상품 URL 붙여넣기
    ↓
[로딩 상태]
  "상품 분석 중..." (스크래핑 + 임베딩 생성)
  예상 소요: 3~5초
    ↓
[결과 페이지]
  상단: 원본 상품 카드 (이미지, 브랜드, 상품명, 가격)
  하단: 유사 아이템 리스트 (최대 10개)
    - 각 아이템: 이미지, 브랜드, 상품명, 가격, 절약율, 구매 링크
    ↓
[아이템 클릭]
  외부 쇼핑몰로 이동 (새 탭)
```

---

## 4. 기능 상세 스펙

### 4-1. URL 입력

**입력 처리:**


| 항목     | 스펙                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| 입력 방식  | 텍스트 입력란에 URL 붙여넣기                                                                                           |
| 지원 브랜드 | Saint Laurent (ysl.com), Bottega Veneta (bottegaveneta.com), Balenciaga (balenciaga.com), Prada (prada.com) |
| URL 검증 | 지원 브랜드 도메인인지 확인 → 상품 페이지 URL 패턴인지 확인                                                                        |


**스크래핑 추출 데이터:**


| 필드           | 설명                             | 필수  |
| ------------ | ------------------------------ | --- |
| product_name | 상품명                            | Y   |
| brand        | 브랜드명                           | Y   |
| price        | 가격 (KRW 또는 원래 통화)              | Y   |
| currency     | 통화 단위                          | Y   |
| image_url    | 대표 이미지 URL                     | Y   |
| category     | 카테고리 (bags, shoes, clothing 등) | Y   |
| description  | 상품 설명                          | N   |
| original_url | 원본 상품 URL                      | Y   |


### 4-2. 추천 엔진

**파이프라인:**

```
1. 원본 상품 이미지 → Marqo-FashionSigLIP → 512차원 벡터
2. Supabase pgvector에서 cosine similarity 기반 Top 10 검색
3. 같은 카테고리 필터 적용 (bags→bags, shoes→shoes)
4. 결과 반환
```

**필터 규칙:**


| 규칙      | 설명                  |
| ------- | ------------------- |
| 카테고리 매칭 | 원본과 같은 카테고리의 상품만 추천 |
| 가격 상한   | 원본 가격의 50% 이하만 추천   |
| 최소 결과 수 | 3개 미만이면 카테고리 필터 완화  |
| 브랜드 다양성 | 한 브랜드에서 최대 3개까지만    |


### 4-3. 결과 UI

**원본 상품 카드:**

```
┌─────────────────────────────────┐
│  [상품 이미지]                    │
│                                 │
│  SAINT LAURENT                  │
│  Le 5 à 7 숄더백                 │
│  ₩2,890,000                     │
│  ─────────────────              │
│  "이 아이템과 비슷한 아이템 10개"   │
└─────────────────────────────────┘
```

**추천 아이템 카드:**

```
┌──────────────┐
│ [상품 이미지]  │
│              │
│ ZARA         │
│ 숄더백        │
│ ₩89,000      │
│ 97% 저렴     │
│ [구매하기 →]  │
└──────────────┘
```

**레이아웃:**

- 모바일: 추천 카드 1열 (세로 스크롤)
- 태블릿: 추천 카드 2열 그리드
- 데스크탑: 추천 카드 3~4열 그리드

---

## 5. 엣지 케이스 정책


| 상황                         | 처리                                                                          |
| -------------------------- | --------------------------------------------------------------------------- |
| 지원하지 않는 URL 입력             | "현재 지원하는 브랜드: Saint Laurent, Bottega Veneta, Balenciaga, Prada" 안내 + 입력란 유지 |
| 상품 URL이 아닌 카테고리/메인 페이지 URL | "상품 페이지 URL을 입력해주세요" 안내                                                     |
| 스크래핑 실패 (사이트 구조 변경 등)      | "상품 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요"                                         |
| 유사 아이템 0개 (벡터 검색 결과 없음)    | "아직 비슷한 아이템을 찾지 못했어요. 곧 더 많은 상품이 추가됩니다"                                     |
| 유사 아이템 3개 미만               | 카테고리 필터 완화하여 재검색 후에도 부족하면 있는 만큼만 표시                                         |
| 이미지 로드 실패 (추천 아이템)         | 플레이스홀더 이미지 + 상품명/가격은 표시                                                     |
| 원본 상품 품절/단종                | 정상 추천 진행 (원본 카드에 "품절" 표시 없음, URL이 유효하면 추천은 가능)                              |
| 동일 URL 재입력                 | 캐시된 결과 즉시 반환 (24시간 캐시)                                                      |
| 비정상 URL (http 아닌 문자열 등)    | "올바른 URL을 입력해주세요"                                                           |


---

## 6. 기술 아키텍처

### 전체 구조

```
[사용자]
  ↓ URL 입력
[Next.js Frontend (Vercel)]
  ↓ API Route 호출
[API: /api/recommend]
  ├→ [Scraper] 럭셔리 브랜드 상품 스크래핑
  │    → Playwright로 상품 정보 + 이미지 추출
  ├→ [Embedder] HuggingFace Spaces (Marqo-FashionSigLIP)
  │    → 이미지 → 512차원 벡터
  └→ [Search] Supabase pgvector
       → cosine similarity Top 10
       → 필터 적용 후 결과 반환
```

### 오프라인 파이프라인 (크롤링)

**소스 우선순위 체계:**
```
1순위: 자체몰 (이미지 퀄리티 최고, 최신 상품)
2순위: 플랫폼 — 무신사/29CM (자체몰 실패 or 없는 경우)
3순위: Naver Shopping API (가격 검증, 품절 체크, 폴백)
```

**브랜드별 크롤링 소스:**

| 브랜드 | 1순위 (자체몰) | 2순위 (플랫폼) | 3순위 (API) |
|--------|--------------|--------------|------------|
| ZARA | zara.com/kr | — | Naver |
| H&M | hm.com/ko_kr | — | Naver |
| COS | cos.com/ko-kr | 무신사 | Naver |
| MANGO | shop.mango.com/kr | 무신사 | Naver |
| & Other Stories | stories.com/ko | — | Naver |
| UNIQLO | uniqlo.com/kr | — | Naver |
| 해칭룸 | 자체몰 (확인 필요) | 무신사/29CM | Naver |
| Art if Acts | 자체몰 (확인 필요) | 무신사/29CM | Naver |
| 쿠어 | 자체몰 (확인 필요) | 무신사/29CM | Naver |

**파이프라인:**
```
[Cron Job / 수동 실행]
  ↓
[Crawler] 소스 우선순위에 따라 실행
  ├→ 자체몰 크롤러 (Playwright) — 성공 시 저장
  ├→ 실패 시 → 플랫폼 크롤러 (무신사/29CM)
  └→ 보조 → Naver Shopping API (가격/품절 검증)
  ↓
[Embedder] Google Colab / HuggingFace Spaces
  → 각 상품 이미지 → 512차원 벡터
  ↓
[Supabase]
  → products 테이블에 상품 정보 + 벡터 저장
```

### 기술 스택


| 영역      | 선택                               |
| ------- | -------------------------------- |
| 프레임워크   | Next.js 15 (App Router)          |
| 언어      | TypeScript                       |
| 스타일링    | Tailwind CSS                     |
| UI 컴포넌트 | DaisyUI (custom theme)                        |
| DB      | Supabase (PostgreSQL + pgvector) |
| 이미지 임베딩 | Marqo-FashionSigLIP              |
| 벡터 검색   | pgvector (cosine similarity)     |
| 스크래핑    | Playwright                       |
| 배포      | Vercel                           |


---

## 7. 데이터 모델

### products 테이블

```sql
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand         TEXT NOT NULL,           -- 'zara', 'hm', 'cos' 등
  brand_tier    TEXT NOT NULL,           -- 'spa', 'domestic_designer'
  name          TEXT NOT NULL,           -- 상품명
  price         INTEGER NOT NULL,        -- 가격 (KRW)
  currency      TEXT DEFAULT 'KRW',
  category      TEXT NOT NULL,           -- 'bags', 'shoes', 'outerwear', 'tops', 'bottoms', 'accessories'
  image_url     TEXT NOT NULL,           -- 상품 이미지 URL
  product_url   TEXT NOT NULL,           -- 구매 링크
  embedding     vector(512),             -- Marqo-FashionSigLIP 임베딩
  is_available  BOOLEAN DEFAULT true,    -- 판매 중 여부
  crawled_at    TIMESTAMPTZ NOT NULL,    -- 크롤링 시점
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 벡터 검색 인덱스
CREATE INDEX ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 카테고리 필터용 인덱스
CREATE INDEX ON products (category, is_available);
```

### recommendation_cache 테이블

```sql
CREATE TABLE recommendation_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url      TEXT NOT NULL UNIQUE,    -- 입력된 럭셔리 상품 URL
  source_brand    TEXT NOT NULL,
  source_name     TEXT NOT NULL,
  source_price    INTEGER,
  source_currency TEXT DEFAULT 'KRW',
  source_image    TEXT NOT NULL,
  source_category TEXT NOT NULL,
  source_embedding vector(512),
  result_ids      UUID[] NOT NULL,          -- 추천된 product ID 배열
  created_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL       -- 24시간 후 만료
);

CREATE INDEX ON recommendation_cache (source_url);
```

### supported_brands 테이블

새 브랜드 추가 시 이 테이블에 한 행만 추가하면 됨. tier/role에 관계없이 동일한 구조.

```sql
CREATE TABLE supported_brands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,             -- 'Saint Laurent'
  name_ko       TEXT,                      -- '생로랑' (한국어 표기)
  slug          TEXT NOT NULL UNIQUE,      -- 'saint-laurent'
  tier          TEXT NOT NULL,             -- 'luxury', 'spa', 'domestic_designer'
  role          TEXT NOT NULL,             -- 'source' (입력 대상) | 'alternative' (추천 대상) | 'both'
  domain        TEXT,                      -- 'ysl.com'
  url_pattern   TEXT,                      -- 상품 URL 정규식 패턴 (source 역할 시)
  crawl_sources JSONB DEFAULT '[]',        -- [{"url": "https://musinsa.com/brand/coor", "type": "musinsa"}, {"url": "https://coor.kr", "type": "self"}]
  price_range   JSONB,                     -- {"min": 80000, "max": 300000, "currency": "KRW"}
  categories    TEXT[] DEFAULT '{}',       -- 해당 브랜드가 커버하는 카테고리
  scraper_id    TEXT,                      -- 크롤러 모듈 식별자 (예: 'zara', 'musinsa-generic')
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

**새 브랜드 추가 예시:**

```sql
-- 럭셔리 브랜드 추가 (예: Celine)
INSERT INTO supported_brands (name, name_ko, slug, tier, role, domain, url_pattern)
VALUES ('Celine', '셀린느', 'celine', 'luxury', 'source', 'celine.com', '/[a-z-]+/p/[A-Z0-9]+');

-- SPA 브랜드 추가 (예: Massimo Dutti)
INSERT INTO supported_brands (name, name_ko, slug, tier, role, crawl_sources, scraper_id, price_range)
VALUES ('Massimo Dutti', '마시모두띠', 'massimo-dutti', 'spa', 'alternative',
  '[{"url": "https://massimodutti.com/kr", "type": "self"}]',
  'massimo-dutti', '{"min": 80000, "max": 400000, "currency": "KRW"}');
```

---

## 8. 브랜드 커버리지

### 럭셔리 (입력 대상) — 4개


| 브랜드            | 도메인               | 선정 이유                          |
| -------------- | ----------------- | ------------------------------ |
| Saint Laurent  | ysl.com           | 클린한 디자인, SPA에서 가장 많이 참고하는 브랜드  |
| Bottega Veneta | bottegaveneta.com | 인트레치아토 등 특유의 디자인 언어, 로고 없는 럭셔리 |
| Balenciaga     | balenciaga.com    | 오버사이즈/스트릿 감성, SPA에서 실루엣 차용 활발  |
| Prada          | prada.com         | 나일론/미니멀 라인, 다양한 카테고리 커버        |


### SPA / 저가 대안 (추천 대상) — 9개

**글로벌 SPA:**


| 브랜드             | 크롤링 소스         | 가격대             | 특성                 |
| --------------- | -------------- | --------------- | ------------------ |
| ZARA            | zara.com       | ₩30,000~200,000 | 럭셔리 디자인 차용 가장 활발   |
| H&M             | hm.com         | ₩10,000~100,000 | 저가, 넓은 카테고리        |
| COS             | cos.com        | ₩50,000~300,000 | 미니멀, 좋은 소재         |
| MANGO           | shop.mango.com | ₩40,000~200,000 | 유럽 감성, 가방/아우터 강점   |
| & Other Stories | stories.com    | ₩50,000~250,000 | H&M 상위 라인, 디자인 퀄리티 |
| UNIQLO          | uniqlo.com     | ₩10,000~150,000 | 베이직, 소재 퀄리티        |


**국내 디자이너:**


| 브랜드                  | 크롤링 소스    | 가격대              | 특성       |
| -------------------- | --------- | ---------------- | -------- |
| 해칭룸 (Hatchingroom)   | 무신사 + 자체몰 | ₩100,000~400,000 | 컨템포러리 감성 |
| 아트이프액츠 (Art if Acts) | 무신사 + 자체몰 | ₩80,000~350,000  | 아트 감성    |
| 쿠어 (Coor)            | 무신사 + 자체몰 | ₩80,000~300,000  | 미니멀 스트릿  |


---

## 9. 카테고리 분류 체계


| 카테고리 ID     | 한국어  | 설명                   |
| ----------- | ---- | -------------------- |
| bags        | 가방   | 숄더백, 토트백, 크로스바디, 클러치 |
| shoes       | 신발   | 부츠, 스니커즈, 로퍼, 힐, 샌들  |
| outerwear   | 아우터  | 코트, 자켓, 블레이저, 패딩     |
| tops        | 상의   | 셔츠, 니트, 티셔츠, 블라우스    |
| bottoms     | 하의   | 팬츠, 스커트, 데님, 쇼츠      |
| accessories | 액세서리 | 벨트, 스카프, 모자, 주얼리     |


---

## 10. 로드맵

### Phase 0: PoC (최소 검증)

**목표**: 전체 파이프라인이 동작하는지, 추천 품질이 쓸만한지 검증

| 항목 | 스코프 |
|------|--------|
| 입력 | Saint Laurent (ysl.com) 1개만 |
| 추천 대상 | ZARA + COS 2개만 |
| 카테고리 | 전체 (가방, 신발, 의류, 액세서리) |
| UI | 최소 — 입력란 + 결과 리스트 |
| 크롤링 | ZARA, COS 자체몰 크롤링 |
| 임베딩 | Marqo-FashionSigLIP (Colab에서 배치) |
| DB | Supabase pgvector |

**PoC 성공 기준:**
- ysl.com URL → 상품 정보 스크래핑 성공
- ZARA/COS 상품 100개 이상 크롤링 + 임베딩 저장
- 유사도 검색 결과가 눈으로 봤을 때 "비슷하다"고 느껴지는 수준
- E2E 플로우 5초 이내 응답

**PoC → MVP 전환 조건:**
- 추천 품질 OK → 나머지 브랜드 확장
- 스크래핑 안정성 OK → 크롤링 자동화 (cron)
- 추천 품질 부족 → Phase 1.5 GPT-4o 리랭킹 검토

### Phase 1: MVP (이 PRD 전체 스코프)

- URL 입력 → 벡터 유사도 기반 추천
- 럭셔리 4개 + SPA/디자이너 9개 브랜드
- LLM 필터 없이 벡터만으로 추천

### Phase 2: 텍스트 검색 (별도 PRD 예정)

- "생로랑 바시티 자켓" 텍스트 입력
- 럭셔리 상품 검색 → 선택 → 유사 추천
- 자동완성, 브랜드 필터

### Phase 3: 이미지 검색 (별도 PRD 예정)

- 사진 업로드 → 유사 아이템 추천
- 소셜미디어 스크린샷 지원

### Phase 1.5: GPT-4o 리랭킹 (별도 PRD 예정)

- 벡터 추천 품질 부족 시 GPT-4o Vision으로 2차 필터 추가
- Phase 1 운영 후 품질 평가 결과에 따라 결정

---

## 11. 성공 지표

### 핵심 지표 (MVP)


| 지표           | 설명                      | 목표                         |
| ------------ | ----------------------- | -------------------------- |
| 추천 클릭률 (CTR) | 추천 아이템 클릭 수 / 추천 노출 수   | > 15%                      |
| 검색 완료율       | URL 입력 → 결과 확인까지 완료한 비율 | > 80%                      |
| 추천 만족도       | 추천 결과 유용성 (추후 피드백 기능)   | 정성적 측정                     |
| 응답 시간        | URL 입력 ~ 결과 표시          | < 5초 (캐시 미스), < 1초 (캐시 히트) |


### 운영 지표


| 지표       | 설명             |
| -------- | -------------- |
| 크롤링 커버리지 | 각 브랜드별 크롤링 성공률 |
| 상품 DB 규모 | 총 크롤링된 상품 수    |
| 임베딩 품질   | 카테고리 내 유사도 분포  |


---

## 12. 리스크 & 대응


| 리스크                   | 영향            | 대응                                                  |
| --------------------- | ------------- | --------------------------------------------------- |
| 크롤링 차단                | 상품 DB 업데이트 불가 | User-Agent 로테이션, 요청 간격 조절, 차단 시 알림                  |
| 럭셔리 사이트 구조 변경         | 스크래핑 실패       | 브랜드별 스크래퍼 모듈화, 실패 시 자동 알림                           |
| 임베딩 품질 부족             | 엉뚱한 추천        | Phase 1.5 GPT-4o 리랭킹으로 보완                           |
| Supabase 무료 티어 초과     | 서비스 중단        | 상품 수 모니터링, 오래된 품절 상품 정리                             |
| HuggingFace Spaces 슬립 | 첫 요청 느림       | 주기적 ping으로 깨우기, 또는 Vercel Serverless에 ONNX 모델 직접 배포 |
| 법적 리스크 (크롤링)          | 서비스 중단 요청     | 로봇 정책 준수, 어필리에이트 전환 검토                              |


