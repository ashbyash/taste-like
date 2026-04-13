# 발렌시아가(balenciaga.com) 크롤링 가능성 조사 보고서

## 요약
발렌시아가는 **YSL과 달리 Next.js 기반이 아니며**, 상품 데이터를 **Algolia 검색 엔진**으로 제공하는 구조입니다. YSL 스크래퍼와 유사한 `__NEXT_DATA__` 방식은 사용할 수 없지만, **Algolia API를 통한 크롤링은 가능**합니다.

---

## 1. 기술 스택 분석

### 발렌시아가(balenciaga.com)
- **프레임워크**: Next.js ❌ (YSL과 다름)
- **검색 엔진**: Algolia ✓ (데이터 제공 방식)
- **상품 데이터**: API 기반 (동적 로딩)
- **__NEXT_DATA__**: ❌ 없음
- **내장 JSON**: ❌ 없음
- **React**: ❌ 직접 감지 안됨

### YSL(ysl.com)과의 비교

| 항목 | YSL | 발렌시아가 |
|------|-----|----------|
| Framework | Next.js | 레거시/커스텀 |
| 데이터 제공 방식 | `__NEXT_DATA__` JSON | Algolia API |
| HTTP fetch | ✓ 가능 | ✗ (API 필수) |
| 파싱 방식 | HTML + JSON 추출 | Algolia 쿼리 |
| 구현 난이도 | 낮음 | 중간 |

---

## 2. 크롤링 방식 선택지

### 옵션 A: Algolia API 직접 쿼리 (권장)
```
장점:
✓ 정확한 상품 데이터 (이미 structured)
✓ 페이지네이션 자동 처리
✓ 필터링 가능 (카테고리, 성별, 가격)
✓ 빠른 응답 (API 직접 조회)

단점:
✗ Algolia 인증 필요 (public token 또는 우회)
✗ Rate limiting 있을 수 있음
✗ API 변경 시 의존성
```

**구현 복잡도**: ★★☆☆☆ (중간)

### 옵션 B: Playwright 기반 브라우저 크롤링
```
장점:
✓ DOM에서 렌더링된 상품 추출 가능
✓ 이미지 로딩 자동 처리
✓ JavaScript 렌더링 완벽 지원

단점:
✗ 느림 (headless browser 오버헤드)
✗ 리소스 많이 소모
✗ 네트워크 I/O 많음
```

**구현 복잡도**: ★★★☆☆ (높음)

### 옵션 C: BaseCrawler 확장 (현재 아키텍처)
```
장점:
✓ 기존 ZARA/COS 패턴과 일관성
✓ 배치 upsert, 중복 제거 등 재사용
✓ CLI 통합 자동화

단점:
✗ 레거시 페이지 구조 처리 필요
✗ 느린 성능
```

**구현 복잡도**: ★★★★☆ (매우 높음)

---

## 3. 상품 데이터 추출 경로

### 발렌시아가 페이지 구조
```
Page Load
  ↓
dataLayer 주입 (GTM)
  {
    "pageType": "Product List Page",
    "productCategory": "women_bags",
    "algoliaIndex": "products_kr",
    "algoliaUserToken": "abjZkspsxBNs6gvHqlFt1fD6gy"
  }
  ↓
Algolia API Call
  GET /indices/products_kr/query
  ↓
Product Grid 렌더링 (DOM)
  570+ 요소 (스타일링된 카드)
```

### 추출 가능한 데이터
```
✓ 상품명
✓ 가격 (KRW)
✓ 카테고리
✓ 이미지 URL (CDN: saint-laurent.dam.kering.com과 유사)
✓ 상품 URL (구조: /ko-kr/{product-slug})
✓ 설명/구성 (상세 페이지에서)
```

---

## 4. 카테고리 URL 구조

### 여성 카테고리
```
/ko-kr/women/bags       ← 가방
/ko-kr/women/shoes      ← 신발
/ko-kr/women/outerwear  ← 아우터
/ko-kr/women/tops       ← 상의
/ko-kr/women/bottoms    ← 하의
/ko-kr/women/accessories ← 액세서리 (추정)
```

### 남성 카테고리
```
/ko-kr/men/bags
/ko-kr/men/shoes
/ko-kr/men/outerwear
/ko-kr/men/tops
/ko-kr/men/bottoms
/ko-kr/men/accessories (추정)
```

### 상품 페이지 URL 패턴
```
예: /ko-kr/le-druk-s-laptop-bag-in-leather-773397aaaea1000
구조: /ko-kr/{product-slug}

데이터:
✓ 제목: <h1>
✓ 가격: [class*="price"]
✓ 이미지: <img src="...saint-laurent.dam.kering.com...">
✓ 상세: <p>, <dl> 등
```

---

## 5. Algolia API 활용 가능성

### 발견된 설정
```javascript
algoliaIndex: "products_kr"        // 한국 상품 인덱스
algoliaUserToken: "abjZkspsxBNs..." // Public search token
```

### API 엔드포인트 (추정)
```
Method: POST
URL: https://[app-id].algolia.net/1/indexes/products_kr/query

Body:
{
  "params": "query=*&filters=gender:women&facets=category"
}

Headers:
  X-Algolia-API-Key: {userToken}
  X-Algolia-Application-Id: {app-id}
```

### 검증 필요
- [ ] App ID 찾기 (개발자 도구 Network 탭)
- [ ] Public token 유효성 확인
- [ ] Rate limit 정책
- [ ] 필터링 문법 (gender, category, price)

---

## 6. 이미지 CDN 구조

### URL 패턴
```
예: https://saint-laurent.dam.kering.com/...

구조:
- 높은 해상도 (YSL과 동일: 2608x3260)
- 이미지 프록시 필수 (hotlinking 방지)
- 캐시 가능 (정적 에셋)
```

---

## 7. 구현 로드맵 (추천)

### Phase 1: Algolia API 직접 쿼리 (3~4시간)
```
1. Algolia App ID 확인
2. scrapeBalenciagaProduct() 함수 작성
   - 상품 URL 정규화
   - HTTP fetch + Algolia query
   - JSON 파싱
   - 카테고리 매핑
3. 단일 상품 테스트 (test-balenciaga-scraper.ts)
```

### Phase 2: BaseCrawler 통합 (선택사항, 2~3시간)
```
1. BalenciagaCrawler 클래스 구현
2. WOMEN_URLS / MEN_URLS 정의
3. extractProducts() 메서드 (Algolia)
4. registry.ts에 등록
5. npm run crawl -- balenciaga 동작 확인
```

### Phase 3: 배치 크롤링 (1~2시간)
```
1. sitemap 또는 카테고리 페이지에서 URL 수집
2. scripts/crawl-balenciaga.ts 작성
3. Colab 배치 임베딩
```

---

## 8. 리스크 및 고려사항

### 기술적 리스크
| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| Algolia API 폐쇄 | 낮음 | 높음 | Playwright 백업 |
| Public token 무효화 | 중간 | 높음 | 동적 token 수집 |
| Rate limiting | 중간 | 중간 | 지연 및 재시도 |
| 이미지 CDN 변경 | 낮음 | 중간 | 정규식 유연성 |

### 프로덕션 고려사항
- **Vercel 배포**: Algolia API 호출 가능 ✓
- **YSL 403 에러**: 발렌시아가도 동일할 수 있음 (IP 차단 가능성)
  - 대응: Playwright headless + rotating proxies
- **법적**: Kering 이용약관 확인 필수

---

## 9. 최종 권장안

### 추천 구현 전략
```
1차 (빠른 방식): Algolia API 직접 쿼리
   - 상품명, 가격, 카테고리, URL 추출
   - scrapeBalenciagaProduct() 함수 (YSL과 유사 패턴)
   - 응답 시간: 300~500ms

2차 (안정화): Playwright 보완
   - 이미지 URL 정확성 보증
   - Algolia 장애 시 백업
   - 상세 페이지 데이터 (설명, 구성)

3차 (선택): BaseCrawler 통합
   - ZARA/COS와 동일한 CLI 경험
   - 자동화된 배치 크롤링
```

### 시간 투자
- **Algolia 방식**: ~4시간 (가장 효율적)
- **Playwright 방식**: ~8시간
- **BaseCrawler 통합**: +6시간 (선택)

### 기대 결과
```
- 발렌시아가 여성: ~1,200~1,500 상품
- 발렌시아가 남성: ~800~1,000 상품
- YSL과 함께 전체 luxury source 2개 확보
- ZARA/COS + Balenciaga 조합으로 글로벌 커버리지
```

---

## 10. 다음 단계

1. **즉시**: Balenciaga 페이지 개발자 도구에서 Algolia App ID 확인
2. **검증**: Algolia API 엔드포인트 테스트 (curl/postman)
3. **구현**: YSL 스크래퍼 패턴을 참고해서 scrapeBalenciagaProduct() 작성
4. **배포 전**: Vercel에서 API 호출 가능성 테스트

---

## 참고 자료

### 기존 구현
- `/Users/ash/taste-like/src/lib/scrapers/ysl.ts` — 단일 URL 스크래퍼 패턴
- `/Users/ash/taste-like/src/lib/scrapers/zara.ts` — API 인터셉트 패턴
- `/Users/ash/taste-like/scripts/crawl-ysl.ts` — 배치 크롤링 패턴

### 발렌시아가 특화 학습
- Algolia 공식 API: https://www.algolia.com/doc/
- Kering 기술 스택: YSL과 공유 (San Diego 데이터센터, 동일 CDN)

