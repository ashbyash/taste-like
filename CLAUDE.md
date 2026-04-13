# taste-like

AI-powered fashion alternative finder: input a luxury brand item URL, get visually similar items from affordable brands.

## Tech Stack

| Area | Choice |
|------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + DaisyUI (custom theme) |
| DB | Supabase (PostgreSQL + pgvector) |
| Embedding | Marqo-FashionSigLIP (768-dim) |
| Scraping | Playwright |
| Deployment | Vercel |

## Project Structure

```
src/
├── app/              # App Router pages
├── components/       # React components
├── lib/
│   ├── supabase/     # Supabase client & queries
│   ├── scrapers/     # Brand-specific scrapers
│   ├── embedding/    # Marqo-FashionSigLIP client
│   └── recommend/    # Recommendation pipeline
└── types/            # Shared TypeScript types
```

## Key Documents

- Planning: `docs/PLANNING.md`
- MVP PRD: `docs/prd/PRD-001-mvp-url-recommendation.md`
- Roadmap: `docs/roadmap.md`
- Architecture & DB schema: `.claude/rules/architecture.md`

## Current Phase: PoC

- **Input**: Saint Laurent (ysl.com) only
- **Output**: ZARA + COS only
- **Goal**: Prove recommendation quality before expanding brands

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # Linting
```

## Project-Specific Rules

- **No hallucinated data**: Brand price ranges must come from actual crawled data
- **Verified prices only**: Do not pre-fill price_range until crawl data confirms
- **Scraper naming**: One module per brand, named by slug (e.g., `scrapers/zara.ts`)
- **Image proxy required**: Never expose external image URLs directly to frontend
- **DaisyUI theming**: Use custom theme tokens, not raw hex values

## Anthropic References
작업 시 아래 레퍼런스를 참조하여 품질을 높인다:
- 코드 기반 eval (추천 결과 정확도 검증): ~/anthropic-refs/courses/prompt_evaluations/03_code_graded_evals/
- 구조화 JSON 출력 강제: ~/anthropic-refs/claude-cookbooks/tool_use/extracting_structured_json.ipynb
- Promptfoo eval 프레임워크: ~/anthropic-refs/courses/prompt_evaluations/05_prompt_foo_code_graded_animals/

## Doc Paths
- 현재 상태: docs/status.md
- 구현 계획: docs/plans/ (not docs/superpowers/plans/)
- 설계 명세: docs/specs/ (not docs/superpowers/specs/)
- PRD: docs/prd/
- 로드맵: docs/roadmap.md
