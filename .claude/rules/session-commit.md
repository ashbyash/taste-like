# Session End Commit

When the user runs `/handoff` or ends a session:
- Check `git status` for uncommitted changes
- If uncommitted changes exist, suggest running `/commit` before handoff
- After commit, remind user to `git push` (Vercel auto-deploys from GitHub)
- Uncommitted changes across sessions risk lost work and create cleanup overhead
