# Session #41 — Reliability hardening (Telegram bot + HF Space self-heal)

**Date**: 2026-04-17
**Branch**: main (5 commits ahead of session start)
**Commits**: `eee0fe4`, `d88b8ee`, `a2c2c3c`, `399023f`, `9969c9f` — all pushed

## 1. Completed Work

### Silent-failure elimination (exit 1 on real failure + GITHUB_OUTPUT stats)
- `scripts/batch-embed.ts`
  - Added `writeGithubOutput()` helper
  - Emits `total`, `success`, `failed`, `cache_invalidated`
  - Exits 1 when `total > 0 && success === 0` or when cache invalidation fails after successful embeds
  - `embedWithRetry` now logs actual `err.message` on each retry (was silent `Retry 1/2 after 1000ms...`)
  - Collects up to 5 error samples printed at end of run
  - Preflight `ensureSpaceHealthy()` call — aborts with exit 1 if Space cannot reach RUNNING
- `scripts/cleanup.ts`
  - `checkAndMarkBrokenImages` / `deleteUnavailable` now return `PhaseResult { count, hadError }` instead of swallowing DB errors
  - `invalidateCache` returns boolean
  - Emits `marked`, `deleted`, `cache_invalidated`, `had_errors`
  - Exits 1 if any phase had an error
- `scripts/batch-describe.ts`
  - Same pattern: emits `total/success/failed`, exits 1 on total failure

### HF Space auto-heal (new lib + workflow)
- New: `src/lib/hf/control.ts` (230 lines)
  - `pingSpace(timeoutMs)` — GET root; considers 200 + JSON content-type healthy (catches HF 500 HTML pages)
  - `getSpaceRuntime()` — GET `/api/spaces/{repo_id}/runtime`
  - `restartSpace(factoryReboot)` — POST `/api/spaces/{repo_id}/restart[?factory=true]`
  - `ensureSpaceHealthy({ allowRestart, factoryReboot, maxWaitMs, pollIntervalMs })` — ping → stage check → wake-up wait for SLEEPING/BUILDING/APP_STARTING → else restart → poll until RUNNING → final ping
  - Returns `{ action: 'already-healthy' | 'woken-up' | 'restarted' | 'failed', finalStage, finalStatus, elapsedMs, note }`
  - Reads `HF_SPACE_URL`, `HF_TOKEN`, `HF_SPACE_REPO_ID` (fallback literal `ashbyash/taste-like-embed`)
- New: `scripts/hf-keepalive.ts` — standalone runner, emits GITHUB_OUTPUT, exit 1 on `failed`
- New: `.github/workflows/hf-keepalive.yml` — daily cron `0 18 * * *` (03:00 KST), `workflow_dispatch`, notify skips on `already-healthy`

### Diagnostic tool
- New: `scripts/ping-hf.ts` — manual HF Space debug (root GET, POST /embed, POST /embed without API key for auth check). Used during session to confirm outage mode

### Telegram bot UX
- `src/lib/telegram.ts`
  - Exported `ReplyKeyboardMarkup` type
  - `sendTelegramMessage` accepts optional `replyMarkup`
- `src/app/api/telegram/webhook/route.ts`
  - Added `DEFAULT_KEYBOARD`: 3×2 grid — `/status` `/health` / `/embed` `/cleanup` / `/crawl` `/help`
  - `is_persistent: true`, `resize_keyboard: true`
  - Attached to every `reply()`

### Workflow notification upgrades
- `on-demand-embed.yml`: step id + outputs + `HF_SPACE_REPO_ID` env + Requested/Embedded/Failed/Cache in Telegram
- `on-demand-cleanup.yml`: step id + outputs + Marked/Deleted/Cache/Errors in Telegram
- `weekly-crawl.yml`:
  - step id + outputs on batch-describe and batch-embed
  - `HF_SPACE_REPO_ID` env on batch-embed
  - **NEW `notify` job**: depends on all 5 upstream jobs, renders per-job icons (success/failure/cancelled/skipped), shows describe/embed stats and cache invalidation

### Verified this session
- `/cleanup` — reported `Marked 0, Deleted 0, Cache invalidated true, Errors false` (all 281 images HEAD OK)
- `/embed` post-restart — `Requested 281, Embedded 275, Failed 6, Cache invalidated true`
- `hf-keepalive.yml` workflow_dispatch — 20s total, keepalive ✅, notify ⊘ skipped as designed (already-healthy)
- `scripts/ping-hf.ts` local — confirmed Space 500 HTML during outage, 200 JSON after manual restart
- `scripts/hf-keepalive.ts` local — `already-healthy` in 873ms
- `npm run lint` / `npx tsc --noEmit` / `npm test` (49/49) all pass

## 2. Current State

```
git status:
  M CLAUDE.md                                     (pre-existing from before session)
  M docs/prd/PRD-001-mvp-url-recommendation.md    (pre-existing from before session)
  ?? docs/plans/_taste-plans.md                   (pre-existing, untracked)
  ?? docs/product-definition.md                   (pre-existing, untracked)
  ?? docs/specs/_taste-specs.md                   (pre-existing, untracked)
```

All session changes committed + pushed. Only remaining uncommitted files were already present before the session started.

`git diff --stat 4e0e601..HEAD`: 14 files changed, 951 insertions, 101 deletions (includes README.md which was committed in the prior sessions).

GitHub Secrets: `HF_SPACE_REPO_ID` added by user during session.

## 3. Pending Tasks

Discussed but not done this session:
- **Weekly crawl notify** — verified by lint/YAML parse only, not by actual Monday run or `workflow_dispatch` (full crawl takes 1-2h)
- **`HF_TOKEN` write scope** — untested because current Space is healthy. First real crash will reveal it (403 in Telegram `note:` field if missing)

Carried from prior sessions (per memory):
- `formatPrice()` 잔여 인라인 정리
- `text-base-content/60` 잔존
- `pipeline.ts` debug `console.log`
- Missing subcategory 943건 (`update-subcategory.ts` 재실행)
- 통합 테스트: `getRecommendations()` + `getEmbedding()` (mock)
- CI에 `npm test` 추가
- Rate limiting (Vercel Redis)
- `TELEGRAM_WEBHOOK_SECRET` 설정 (optional)

## 4. Key Decisions Made

- **Silent-failure fix > better logging alone**: exit 1 + `$GITHUB_OUTPUT` stats over console-only improvements. Workflow notify reads `needs.<job>.result` — without exit 1, Telegram always said "완료" regardless of outcome
- **Keep-alive cadence: daily**: 48h is HF Free CPU sleep threshold. Daily gives safety margin without spam
- **Wake-up wait before restart**: `ensureSpaceHealthy` checks runtime stage first. If SLEEPING/BUILDING/APP_STARTING, waits up to 60s for natural wake-up instead of immediately burning a restart
- **Final ping after RUNNING**: runtime stage RUNNING ≠ app serving. Final `pingSpace()` confirms FastAPI is actually responding, not just container alive
- **Hardcoded repo_id fallback**: control.ts defaults to `'ashbyash/taste-like-embed'` if env unset. Secret was added so fallback is currently inert
- **Notify silent on healthy**: `hf-keepalive.yml` notify `if:` includes `action == 'restarted' || action == 'woken-up'`. Prevents daily "✅ already healthy" spam
- **Keyboard layout**: 6 commands in 3×2 grid matching user's screenshot reference. `/crawl` bare prints usage+brand list, so the button doubles as a brand reminder

## 5. Blockers / Issues Found

### HF Space outage (triggered this session's work)
- **Symptom**: `/embed` showed `Embedded 0 / Failed 281`
- **Root cause found via `scripts/ping-hf.ts`**:
  - Root GET → 500 HTML (HF platform error page)
  - `POST /embed` → 500 HTML
  - `POST /embed` without API key → 500 HTML (auth not even reached)
  - HTML body was HF's generic error page, not our FastAPI output → Space container Errored
- **Fix**: User clicked Restart in HF dashboard. Root then returned `200 OK {"status":"ok","service":"taste-like-embed"}` (13s wake)
- **Prevention installed**: `ensureSpaceHealthy` preflight + `hf-keepalive.yml` workflow

### Earlier logging gap
- `batch-embed.ts`'s retry log was `Retry 1/2 after 1000ms...` with no error detail. Meant 281 failures were opaque — could have been auth, URL, or Space down
- Fixed: retry log now includes `err.message`; final throw appends `(image_url=...)`; main collects up to 5 error samples printed after run

### GitHub Actions security-reminder hook
- PreToolUse hook flagged 3 workflow edits during session warning about command injection patterns
- All our edits already use env-var-first pattern. Retrying the same edit worked — hook is advisory, not blocking

## 5-1. Failed Approaches (삽질 기록)

없음. HF restart API 엔드포인트가 공식 OpenAPI 문서에 빠져있어서 `huggingface_hub` Python client 소스 (`hf_api.py` line 8000-8044, `restart_space` method)에서 스펙 확인 필요했던 것만 소규모 우회. 그 외 진행한 접근 모두 한 번에 동작.

## 6. Active Plan File

없음. 대화 중 합의된 범위로 파일 없이 진행.

## 7. Roadmap Sync

`product/roadmap.md` 없음 — 생략. 이번 세션 작업은 안정성/관측성 개선이라 로드맵 항목 아님.

## 8. Context for Next Session

### 핵심 시스템 이해
- **HF Space 상태 구분**
  - `SLEEPING`: 자연 웨이크로 회복 가능, ~13s
  - `BUILDING`/`APP_STARTING`: 진행 중, 대기
  - `RUNTIME_ERROR`/`BUILD_ERROR`/`NO_APP_FILE`: restart API 필요
  - `RUNNING`: 정상
  - `ensureSpaceHealthy`가 이 분기를 내부에서 처리
- **Runtime RUNNING ≠ 서비스 정상**: HF 플랫폼이 컨테이너를 살렸어도 FastAPI가 크래시 루프면 runtime만 RUNNING이고 엔드포인트는 500. Final ping으로 이 함정을 잡는다
- **Workflow result 판정 순서**: step exit code → job result → `needs.<job>.result` → notify `if:`. 스크립트가 exit 0이면 절대 `failure`로 안 찍힘. 이게 옛 batch-embed의 silent-failure 원인이었음
- **HF Restart API 스펙**: `POST https://huggingface.co/api/spaces/{owner}/{repo}/restart?factory=true`, `Authorization: Bearer <HF_TOKEN>`. Token은 Space 소유자의 write token. 403 = 권한 부족, 404 = repo_id 오타, 400 = static Space

### 주의할 부분
- `src/lib/supabase/server.ts` import 체인 — vitest에서 실 DB 안 건드리려면 `vi.mock('@/lib/supabase/server')` 필요 (기존 테스트 패턴)
- `tsx -e` 인라인 실행 금지 — `!` 이스케이프 / CJS 비호환. 별도 `.ts` 파일로
- Workflow YAML 편집 시 PreToolUse 훅이 경고 — 차단 아니고 advisory. 재시도 통과

### 미결 의사결정
없음.

## 9. Next Session Prompt

```
이전 세션(#41)에서 Telegram 봇 키보드(3×2), HF Space 자동 재시작(batch-embed preflight + daily keepalive cron), batch-embed/cleanup/describe 전부 exit 1 + GITHUB_OUTPUT stats 전환, weekly-crawl 종합 notify job 추가. 현재 main 5 커밋 푸시 완료 (9969c9f HEAD), lint/typecheck/test 49 통과.

다음 작업 후보:
- Monday 06:00 KST weekly-crawl 실제 실행 결과로 notify 메시지 포맷 검증
- HF_TOKEN write 스코프 실검증 — 실제 restart 트리거되는 첫 장애에서 Telegram note 확인
- 미결 항목: formatPrice 인라인 정리 / text-base-content/60 잔존 / pipeline.ts console.log / update-subcategory.ts 재실행 (missing subcategory 943건) / CI에 npm test 추가 / Rate limiting

주의: CLAUDE.md, docs/prd/PRD-001, docs/plans/_taste-plans.md, docs/product-definition.md, docs/specs/_taste-specs.md는 이전 세션부터 미커밋/untracked. 필요하면 정리.
```

## 10. Knowledge Log Update

control-tower 프로젝트 아님 — 생략.
