# Environment Variable Sync

When adding a new environment variable to `.env.local`:
- Always remind the user to add it to Vercel Settings as well
- Vercel builds from GitHub, not local — missing env vars cause silent runtime failures
- Format: "Vercel에도 `VAR_NAME` 환경변수 추가 필요합니다."
