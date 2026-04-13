# GA4 Custom Dimension Sync

When adding a new parameter to `trackEvent()` calls:
- Remind the user to register it as a GA4 custom dimension
- GA4 Admin → Custom definitions → Custom dimensions → Create
- Format: "GA4에도 `param_name` 맞춤 측정기준 등록 필요합니다."
- Unregistered parameters are invisible in Explore reports and data is NOT retroactive
- Update the registry comment in `src/lib/analytics.ts`
