---
name: warn-direct-supabase-mutation
enabled: true
event: bash
pattern: supabase\s+.*\b(DELETE|UPDATE|DROP|TRUNCATE|ALTER)\b
action: warn
---

**Direct Supabase mutation command detected.**

- Verify you are targeting the correct environment (local vs production)
- Consider using a migration file instead of direct commands
- Back up data before destructive operations
