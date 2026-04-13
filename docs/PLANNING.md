# taste-like Planning Document

> Project: [[taste-like]]

## Version
- v0.4 | 2026-02-27 | PoC 완료, 임베딩 768-dim 확정, E2E 파이프라인 동작
- v0.3 | 2026-02-26 | Q1~Q4 전체 의사결정 완료

---

## 1. 서비스 컨셉

**한 줄 요약**: 럭셔리/컨템포러리 브랜드 아이템의 저렴한 대안을 AI로 찾아주는 서비스

**핵심 가치**: "생로랑 맛 자라" — 디자인은 비슷하되 가격은 1/10

### 사용자 시나리오
1. 유저가 생로랑 공식몰에서 부츠 URL을 복사해서 붙여넣기
2. 시스템이 해당 상품 정보(이미지, 카테고리, 디자인 특성)를 추출
3. 크롤링된 SPA/저가 브랜드 상품 DB에서 AI가 유사 아이템을 매칭
4. 유저에게 "이 부츠랑 비슷한데 훨씬 싼 부츠들" 리스트 제공

---

## 2. 단계별 로드맵

### Phase 1: MVP (URL → 추천)
- 럭셔리 브랜드 URL 입력 → 상품 정보 스크래핑
- SPA 브랜드(자라, H&M, COS 등) 상품 크롤링 & DB 구축
- AI(Claude/GPT Vision)가 이미지+메타데이터 기반 유사도 분석
- 추천 결과 카드형 UI로 표시 (이미지, 가격, 구매 링크)

### Phase 2: 텍스트 검색
- "생로랑 바시티 자켓" 같은 텍스트 입력
- 럭셔리 상품 검색 결과 표시 → 클릭 시 유사 저가 아이템 추천
- 자동완성/브랜드 필터

### Phase 3: 이미지 검색
- 유저가 사진 업로드
- Vision AI로 아이템 분석 → 유사 저가 아이템 추천
- 소셜미디어 스크린샷도 지원

---

## 3. MVP 핵심 기능 상세

### 3-1. 입력: URL 파싱
| 항목 | 상세 |
|------|------|
| 지원 브랜드 | Saint Laurent, Bottega Veneta, Balenciaga, Prada (로고 플레이 적고 디자인 차용하기 좋은 브랜드) |
| 추출 데이터 | 상품명, 가격, 카테고리, 대표 이미지, 상품 설명 |
| 방식 | 브랜드별 스크래핑 로직 or Puppeteer(SPA 사이트 대응) |

### 3-2. 상품 DB: SPA 브랜드 크롤링
| 항목 | 상세 |
|------|------|
| 대상 브랜드 | **글로벌 SPA**: ZARA, H&M, COS, MANGO, & Other Stories, UNIQLO / **국내 디자이너**: 해칭룸, 아트이프액츠, 쿠어 |
| 크롤링 주기 | 주 1~2회 (신상품 반영) |
| 저장 데이터 | 상품명, 가격, 카테고리, 이미지 URL, 상품 URL, 브랜드 |
| 이미지 임베딩 | 크롤링 시 각 상품 이미지를 벡터 임베딩으로 변환하여 저장 |

### 3-3. 추천 엔진: AI 매칭
**2단계 매칭 파이프라인:**

```
[입력 상품 이미지]
    → 이미지 임베딩 (CLIP 등)
    → 벡터 DB에서 유사 이미지 Top 50 후보 추출
    → LLM(Claude)이 디자인/실루엣/무드 기준으로 최종 5~10개 선정
    → 결과 반환
```

- **1차 필터**: 벡터 유사도 (빠른 후보 추출)
- **2차 필터**: LLM 판단 (디자인 유사성, 실루엣, 소재감 종합 평가)

### 3-4. 출력: 추천 결과 UI
- 원본 상품 카드 (이미지, 브랜드, 가격)
- 추천 아이템 리스트 (이미지, 브랜드, 가격, 절약 금액, 구매 링크)
- "가격 비교" 뱃지 (예: "95% 저렴")

---

## 4. 기술적 의사결정이 필요한 항목

### Q1: 이미지 임베딩 모델 — DECIDED: Marqo-FashionSigLIP
- 패션 도메인 MRR 0.239 (FashionCLIP 대비 +57%)
- 오픈소스 (Apache 2.0), $0 운영 가능
- ViT-B-16 기반, CPU 추론 가능
- 텍스트+이미지 동일 임베딩 공간 (Phase 2 텍스트 검색 대비)
- 배치 임베딩: Google Colab (무료 GPU) / 온라인 추론: HuggingFace Spaces (무료)

### Q2: 벡터 DB — DECIDED: Supabase pgvector
- 무료 티어 (500MB), DB 통합 관리
- MVP 규모 (수만 개 상품)에 충분

### Q3: 크롤링 방식 — DECIDED: Playwright + 자체몰/무신사
- 글로벌 SPA: 자체몰 크롤링 (ZARA, H&M, COS 등)
- 국내 디자이너: 무신사 + 자체몰 크롤링 (해칭룸, 아트이프액츠, 쿠어)

### Q4: LLM 2차 필터 — DECIDED: GPT-4o (기존 API 보유)
- MVP는 벡터 유사도 Top 10으로 시작 (LLM 필터 없이 $0)
- 품질 부족 시 GPT-4o Vision으로 리랭킹 추가 (벡터 Top 15 → 10개 선정)

---

## 5. 기술 스택 (안)

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 15 (App Router) | SSR + API Routes 통합 |
| 언어 | TypeScript | 타입 안전성 |
| 스타일 | Tailwind CSS | 빠른 UI 개발 |
| UI | DaisyUI (custom theme) | 깔끔한 컴포넌트 |
| DB | Supabase (PostgreSQL + pgvector) | 통합 DB, 무료 티어 |
| 이미지 임베딩 | Marqo-FashionSigLIP (768-dim) | 패션 도메인 SOTA, $0, CPU 추론 가능 |
| 벡터 검색 | pgvector (Supabase) | DB 통합 |
| AI 추천 (Phase 1.5) | GPT-4o Vision | 벡터만으로 부족 시 리랭킹용, 기존 API 보유 |
| 크롤링 | Playwright + cron job | SPA 사이트 대응 |
| 배포 | Vercel | Next.js 최적화 |
| 크롤링 서버 | 별도 서버 or Vercel Cron | 주기적 크롤링 |

---

## 6. MVP 스코프 제안

### 포함 (In Scope)
- [ ] URL 입력 → 상품 정보 추출 (럭셔리 브랜드 3~5개)
- [ ] SPA 브랜드 3~5개 상품 크롤링 & DB 구축
- [ ] 이미지 임베딩 기반 유사도 검색
- [ ] Claude Vision 기반 최종 추천
- [ ] 결과 페이지 UI (원본 vs 추천 비교)
- [ ] 모바일 반응형

### 제외 (Out of Scope for MVP)
- 텍스트 검색 (Phase 2)
- 이미지 업로드 검색 (Phase 3)
- 유저 계정/찜하기
- 가격 알림
- 커뮤니티 기능

---

## 7. PoC 진행 현황 (2026-02-27)

| Phase | 상태 | 내용 |
|-------|------|------|
| Phase 0 | ✅ 완료 | 프로젝트 초기화, DaisyUI 테마, 타입, DB 스키마, Supabase 연결 |
| Phase 0.5 | ✅ 완료 | Supabase 프로젝트 생성, 스키마 적용, 브랜드 시드 |
| Phase 1 | ✅ 완료 | ZARA/COS 크롤러 (1,353 products in DB) |
| Phase 2 | ✅ 완료 | Colab 배치 임베딩 (1,350/1,353 성공, 768-dim) |
| Phase 3 | ✅ 완료 | YSL 스크래퍼 + HF Space 임베딩 + API 라우트 + 프론트엔드 UI |

### PoC 성공 기준 달성
- ✅ ysl.com URL 스크래핑 동작
- ✅ 100+ ZARA/COS 상품 크롤링 + 임베딩 완료
- ✅ 추천 결과 시각적으로 적절 (레더 재킷 → 레더 재킷, bags → bags)
- ✅ E2E 응답 < 5초 (첫 요청 ~3초, 캐시 히트 ~1초)

### 다음 단계 (Post-PoC)
1. **크롤 데이터 보완** — ZARA bags (0개), COS outerwear/accessories (0개) 추가
2. **UI 개선** — 로딩 UX, 에러 메시지, 반응형 디테일
3. **Vercel 배포** — 프로덕션 환경 검증
4. **브랜드 확장** — H&M, MANGO 등 크롤러 추가
5. **LLM 리랭킹 (Phase 1.5)** — 벡터 품질 평가 후 결정
