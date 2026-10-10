# DCS scheduler

Deploy this function and invoke it every minute with Supabase Cron, an external scheduler, or the platform's scheduled functions:

```bash
supabase functions deploy dcs-scheduler --no-verify-jwt
```

The function prepares every auto-mode contest at least ten minutes before its start, guarantees the 4/3/3 question counts, transitions ready contests to `live` at `start_at`, and ends them at `end_at`. Manual-mode contests are never overwritten and are published only after the admin has supplied questions.
