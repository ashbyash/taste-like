# Session #39 — ML Pipeline Unit Tests

**Date**: 2026-04-13
**Commits**: `c8dd373`

---

## 1. Completed Work

### Vitest 설치 + 설정
- **`package.json`**: `vitest@^4.1.4`, `@vitest/coverage-v8@^4.1.4` devDeps 추가, `test`/`test:watch` 스크립트 추가
- **`vitest.config.ts`** (신규): `@/` path alias 해석 + 더미 env vars (Supabase, HF Space) 설정

### Pipeline 함수 export + 테스트
- **`src/lib/recommend/pipeline.ts`**: `filterAndRank`, `extractDomain`, `effectiveSubcategory` 3개 private 함수에 `export` + `/** @internal */` JSDoc 추가. `FilterCandidate` 인터페이스 신규 (queries.ts SimilarProduct 의존 제거). `Category` import 추가.
- **`src/lib/recommend/pipeline.test.ts`** (신규): 19 tests — filterAndRank (source.price=0 NaN, 음수, 경계값 50%, 브랜드 다양성, MAX_RESULTS), extractDomain (www 제거, 서브도메인, 잘못된 URL), effectiveSubcategory (null/undefined/other/valid)

### YSL Scraper 함수 export + 테스트
- **`src/lib/scrapers/ysl.ts`**: `mapCategory`, `detectGender` 2개 private 함수에 `export` + `/** @internal */` JSDoc 추가
- **`src/lib/scrapers/ysl.test.ts`** (신규): 12 tests — mapCategory (keyword→category 매핑, micro fallback, 에러), detectGender (men/women/undefined)

### Subcategory Mappings 테스트
- **`src/lib/subcategory/mappings.test.ts`** (신규): 15 tests — mapNameToSubcategory 한국어/영어 이름 매핑, regex 엣지 케이스 (SHORT SLEEVE 제외, PANTY 제외), 비대상 카테고리 null 반환

### Format 테스트
- **`src/lib/format.test.ts`** (신규): 3 tests — formatPrice 천단위 구분, 0, 소수

---

## 2. Current State

```
branch: main (up to date with origin)
build: Compiled successfully
tests: 49 passed (4 files)
uncommitted: none (clean)
pushed: origin/main 최신 (c8dd373)
```

---

## 3. Pending Tasks

- formatPrice() 잔여 인라인 사용처 정리 (이전 세션 잔여)
- text-base-content/60 잔존 정리 (이전 세션 잔여)
- pipeline.ts 디버그 console.log 정리 (이전 세션 잔여)
- Missing subcategory 943건 (이전 세션 잔여)
- `.claude/worktrees/design-system/` 잔여 worktree 정리 (lint가 .next 아티팩트 스캔)
- 통합 테스트 추가: getRecommendations() 파이프라인 (supabase/HF mock 필요)
- embedding client 검증 테스트: NaN/zero vector/차원 불일치 (fetch mock 필요)
- CI 테스트 통합: GitHub Actions workflow에 `npm test` 단계 추가

---

## 4. Key Decisions Made

| 결정 | 근거 |
|------|------|
| Private 함수 `export` + `@internal` JSDoc | filterAndRank 등 순수 함수를 getRecommendations() 통해 테스트하면 5+ 의존성 mock 필요 → 비효율. export가 가장 가벼운 접근 |
| `FilterCandidate` 인터페이스 분리 | filterAndRank 파라미터가 `Awaited<ReturnType<typeof searchSimilarProducts>>`로 queries.ts에 결합 → 테스트 시 supabase import 불필요하도록 동일 shape 인터페이스로 분리 |
| vitest config에 더미 env vars | pipeline.ts가 scrapers → supabase/server.ts를 import chain으로 로드 → 모듈 초기화 시 createClient() 실행 → env var 없으면 crash. 더미 값으로 초기화만 통과 |
| 순수 함수 유닛 테스트만 (통합 테스트 제외) | 첫 테스트 도입이므로 mock 없이 즉시 가치 제공하는 범위로 한정. 통합 테스트는 후속 |
| Colocated test files | `pipeline.test.ts`를 `pipeline.ts` 옆에 배치. Next.js App Router가 비페이지 파일 무시 + vitest glob `src/**/*.test.ts`과 자연스럽게 호환 |

---

## 5. Blockers / Issues Found

- **빌드 타입 에러 (해결됨)**: `FilterCandidate.category`를 `string`으로 정의 → `RecommendedItem.category`(Category union)과 불일치. `Category` 타입으로 수정 + import 추가로 해결.
- **Supabase env var crash (해결됨)**: 테스트 실행 시 pipeline.ts import chain이 supabase/server.ts 모듈 초기화를 트리거 → `supabaseUrl is required` 에러. vitest.config.ts에 더미 env vars 추가로 해결.
- **Lint worktree 아티팩트**: `npm run lint` 실행 시 `.claude/worktrees/design-system/.next/` 빌드 아티팩트가 스캔됨 → 다수 에러. src/ 파일은 lint 통과. worktree 삭제 필요.

### 5-1. Failed Approaches (삽질 기록)

| 시도 | 실패 이유 | 대안 |
|------|-----------|------|
| FilterCandidate.category를 `string`으로 정의 | RecommendedItem.category가 Category union 타입이라 spread 시 타입 불일치 빌드 에러 | `Category` import 추가 + FilterCandidate.category를 `Category`로 변경 |
| env var 없이 vitest 실행 | pipeline.ts → ysl.ts → supabase/server.ts import chain에서 모듈 초기화 시 createClient() 호출 → crash | vitest.config.ts `test.env`에 더미 값 6개 설정 |

---

## 6. Active Plan File

`/Users/ash/.claude/plans/glimmering-snuggling-giraffe.md` (완료됨)

---

## 7. Roadmap Sync

해당 없음 (docs/roadmap.md에 테스트 관련 항목 없음 — 내부 품질 개선)

---

## 8. Context for Next Session

- **테스트 구조**: 테스트 파일은 소스 옆 colocated (`*.test.ts`). vitest.config.ts에서 `@/` alias + 더미 env 설정.
- **Import chain 주의**: pipeline.ts를 import하면 scrapers → supabase/server.ts chain이 실행됨. 통합 테스트 작성 시 `vi.mock('@/lib/supabase/server')` 필요.
- **filterAndRank 발견된 동작**: source.price=0일 때 `item.price > 0 * 0.5` → `item.price > 0` → 양수 가격 아이템은 모두 필터됨 → NaN savings_percent가 실제로는 발생하지 않음 (빈 배열 반환). 다만 source.price가 매우 작은 양수일 때는 여전히 NaN 없이 동작.
- **@internal export**: 3개 pipeline 함수 + 2개 YSL 함수가 `@internal` export. barrel export(`src/components/index.ts`)에는 포함하지 않음.
- **Worktree 잔여**: `.claude/worktrees/design-system/`이 남아있어 lint 시 noise 발생. 삭제 필요.

---

## 9. Next Session Prompt

```
이전 세션에서 ML 파이프라인 유닛 테스트 49개 추가 (vitest 4.1.4 설치, filterAndRank/extractDomain/effectiveSubcategory/mapCategory/detectGender/mapNameToSubcategory/formatPrice). main push 완료 (c8dd373).
현재: main 브랜치, 빌드 성공, 49 tests 통과, origin 최신, clean.
다음 작업: [여기에 다음 작업 기술].
참고: 테스트 파일은 소스 옆 colocated (*.test.ts), vitest.config.ts에 @/ alias + 더미 env. 통합 테스트(supabase/HF mock)는 미구현.
```
