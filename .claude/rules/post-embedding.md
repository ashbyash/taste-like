# Post-Embedding Cache Invalidation

After ANY embedding regeneration (Colab batch or individual):
- Always run `DELETE FROM recommendation_cache;` in Supabase SQL Editor
- Stale cache returns results based on old embeddings, causing incorrect recommendations
- This applies to both full re-embedding and partial (new products only)
