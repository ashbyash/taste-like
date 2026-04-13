# Atoms

최소 UI 단위. 다른 컴포넌트를 import하지 않고 토큰만 사용.

## Badge

인라인 텍스트 강조 표시.

**파일**: `src/components/atoms/Badge.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| variant | `'savings' \| 'category' \| 'similarity'` | — (필수) | 표시 스타일 |
| children | ReactNode | — (필수) | 내용 |
| className | string | `''` | 추가 스타일 |

### Variants

- **savings**: accent 배경, 흰 텍스트 (예: `-96%`)
- **category**: base-200 배경, 기본 텍스트 (예: `아우터`)
- **similarity**: 배경 없음, accent 텍스트 (예: `유사도 94%`)

### 사용 예시

```tsx
<Badge variant="savings">-96%</Badge>
<Badge variant="similarity">유사도 94%</Badge>
```

---

## Button

범용 버튼.

**파일**: `src/components/atoms/Button.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| variant | `'primary' \| 'ghost' \| 'pill'` | — (필수) | 스타일 |
| size | `'sm' \| 'md'` | `'md'` | 크기 |
| loading | boolean | `false` | 로딩 스피너 |
| disabled | boolean | `false` | 비활성 |
| active | boolean | `false` | pill variant 활성 상태 |
| type | `'button' \| 'submit'` | `'button'` | HTML type |
| onClick | function | — | 클릭 핸들러 |
| className | string | `''` | 추가 스타일 |

### Variants

- **primary**: 검정 배경, 흰 텍스트 (검색 제출)
- **ghost**: 투명, hover 시 배경 (뒤로가기)
- **pill**: rounded-full, `active` prop으로 on/off 전환 (카테고리)

---

## Input

텍스트 입력 필드.

**파일**: `src/components/atoms/Input.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| value | string | — (필수) | 입력값 |
| onChange | `(value: string) => void` | — (필수) | 변경 핸들러 |
| onSubmit | function | — | Enter키 핸들러 |
| placeholder | string | — | 플레이스홀더 |
| type | `'text' \| 'url'` | `'text'` | 입력 타입 |
| disabled | boolean | `false` | 비활성 |
| id | string | — | HTML id |
| className | string | `''` | 추가 스타일 |

---

## ProductImage

Next.js Image 래핑. 프록시 URL 자동 적용, aspect ratio 보장.

**파일**: `src/components/atoms/ProductImage.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| src | string | — (필수) | 이미지 URL |
| alt | string | — (필수) | 대체 텍스트 |
| aspect | `'3/4' \| '1/1' \| '4/3'` | `'3/4'` | 비율 |
| radius | `'sm' \| 'none'` | `'sm'` | 모서리 (4px) |
| width | number | `360` | 너비 |
| height | number | `480` | 높이 |
| className | string | `''` | 추가 스타일 |

---

## Skeleton

로딩 플레이스홀더.

**파일**: `src/components/atoms/Skeleton.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| variant | `'card' \| 'text' \| 'image'` | — (필수) | 형태 |
| className | string | `''` | 추가 스타일 |

### Variants

- **card**: 이미지(3:4) + 텍스트 2줄 (상품 카드 로딩)
- **text**: 한 줄 텍스트 바
- **image**: 사각형 이미지 영역

---

## Typography

텍스트 렌더링. 토큰 기반 타이포그래피 적용.

**파일**: `src/components/atoms/Typography.tsx`

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| variant | `'display' \| 'heading' \| 'body' \| 'caption' \| 'label'` | — (필수) | 타이포 스케일 |
| as | `'h1' \| 'h2' \| 'h3' \| 'p' \| 'span'` | variant별 기본값 | HTML 태그 |
| color | `'primary' \| 'secondary' \| 'muted' \| 'accent'` | `'primary'` | 텍스트 색상 |
| align | `'left' \| 'center'` | `'left'` | 정렬 |
| truncate | `boolean \| number` | — | true=1줄, number=N줄 |
| className | string | `''` | 추가 스타일 |

### Variants → HTML 태그 기본 매핑

| variant | 기본 태그 | 폰트 |
|---------|----------|------|
| display | h1 | DM Serif Display |
| heading | h2 | Pretendard |
| body | p | Pretendard |
| caption | p | Pretendard |
| label | span | Pretendard |
