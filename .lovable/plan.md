# Pipeline Resilience & Stuck-Build Recovery

Goal: eliminate builds frozen at 90% signing / 95% processing. Every job must terminate as `completed`, `failed`, `stalled`, or `recovering` — never infinite processing.

Implementation is split across **DB schema**, **worker**, **edge functions**, and **frontend**, in that order, each layer additive and safe for in-flight builds.

---

## 1. Database (migration)

Extend `conversion_jobs` with heartbeat + recovery fields:

- `last_heartbeat timestamptz` — updated by worker every 5 s
- `heartbeat_stage text` — stage reported on last heartbeat
- `heartbeat_progress int` — progress reported on last heartbeat
- `signing_started_at timestamptz` — used by signing-timeout guard
- `upload_attempts int default 0` — retry counter
- `recovery_attempts int default 0` — partial-recovery counter
- `artifact_verified boolean default false` — set true only after size+signature check
- Index on `(status, last_heartbeat)` for the stall sweeper

Extend the existing watchdog RPC `mark_stale_conversion_jobs_as_timeout`:

- Add a sibling RPC `mark_stalled_conversion_jobs(_heartbeat_max interval)` that flips active jobs with `last_heartbeat < now() - 60s` to `status = 'stalled'` (not `timeout`), preserving stage/progress, and writes a `[PIPELINE] Worker heartbeat timeout` line into `last_log`.
- Add `signing_timeout` handling: if `build_stage = 'signing'` and `signing_started_at < now() - 180s`, mark `status = 'signing_timeout'`.

No changes to RLS — new columns inherit existing policies. The existing user-side UPDATE policies remain limited to cancel/timeout transitions.

## 2. Worker (`worker/src/worker.js` + `pipeline.js`)

- New helper `startHeartbeat(jobId, getStage)` runs `setInterval(5000)` writing `last_heartbeat = now()`, `heartbeat_stage`, `heartbeat_progress`. Returns a `stop()` function used in `finally`.
- Wrap both `convert-aab` and `aab-to-apk` workers with the heartbeat.
- Signing step: before invoking `apksigner`/`jarsigner`, set `signing_started_at = now()` and `build_stage = 'signing'`. Run with a 180 s `AbortController`; on timeout, persist `status = 'signing_timeout'`, capture last 4 KB of stderr/stdout into `stderr_log`/`stdout_log`, exit step.
- Upload step: wrap `supabase.storage.upload` in `withRetry(fn, { attempts: 3, baseMs: 1500 })` (exponential backoff 1.5 s / 3 s / 6 s). Increment `upload_attempts` each try. After upload, call `verifyArtifact(storagePath)` which:
  - re-downloads HEAD to confirm `content-length > 0`
  - for `.apk`/`.aab`, runs lightweight zip-magic check (`PK\x03\x04`)
  - sets `artifact_verified = true` before flipping `status = 'done'`/`completed`
- Partial recovery: on job start, if `download_url` is already set and `artifact_verified = false`, skip Gradle/compile and jump to `signing → upload → finalize`. Increment `recovery_attempts`.
- All worker logs use structured prefixes: `[PIPELINE]`, `[SIGNING]`, `[UPLOAD]`, `[HEARTBEAT]`, `[RECOVERY]`.

## 3. Edge functions / cron

- New scheduled job (pg_cron, every 30 s) hits a new edge function `pipeline-watchdog` that calls both `mark_stale_conversion_jobs_as_timeout` and `mark_stalled_conversion_jobs('60 seconds')` + signing-timeout sweep. This guarantees stuck jobs resolve even if the worker dies entirely.
- `process-app` edge function: when re-dispatching a job already in `stalled`/`signing_timeout`, send a `resume: true` flag so the worker takes the partial-recovery path.
- Preserves existing auth, rate limits, CORS, and credit logic — no changes to `convert-app`, monetization, or RLS.

## 4. Frontend

- `src/hooks/useConversionJob.ts`:
  - Track `lastHeartbeatAt` from the row; if `> 45 s` stale while status is non-terminal, show banner **"Recovering pipeline state..."**.
  - Auto-fallback from realtime to 5 s polling when the channel disconnects, then reconnect realtime on visibility change.
  - Treat `stalled`, `signing_timeout`, `timeout` as terminal-recoverable: surface retry button.
- `src/lib/buildStateMachine.ts`: add `stalled`, `signing_timeout`, `recovering` to `BuildJobStatus`, mark `stalled`/`signing_timeout` as non-final (retry allowed) and `completed`/`failed`/`cancelled` as final.
- `src/components/pipeline/BuildPipelineView.tsx`: render heartbeat chip ("Última atividade há Xs"), recovery banner, and a **"Tentar novamente desta etapa"** button when stalled. Button calls existing convert/process endpoint with `resume = true`.
- `src/components/pipeline/BuildErrorPanel.tsx`: surface stderr/stdout tail and a "Ver logs" expand for `signing_timeout`.

## 5. Observability

- All new worker log lines prefixed with `[PIPELINE] / [SIGNING] / [UPLOAD] / [HEARTBEAT] / [RECOVERY]`.
- `system_logs` entries on every state transition: `stalled`, `signing_timeout`, `recovery_started`, `recovery_succeeded`, `artifact_verified`, `upload_retry`.

## 6. Safety / preservation

- Pure additive DB columns + new RPC — no destructive changes, no RLS rewrites.
- Credits, Kiwify webhook, Stripe, validator, AI Copilot untouched.
- SSRF guards, rate limits, admin PIN, founder roles untouched.
- In-flight jobs without `last_heartbeat` are treated as legacy and only fall under the existing 10-minute global watchdog — they cannot be falsely marked stalled.

---

## Technical details (for review)

```text
conversion_jobs lifecycle (after change)

queued → preparing → running_gradle → signing → uploading → finalizing → completed
                                          │           │
                                          │           └─ upload retry ×3 ─ fail → failed
                                          └─ >180s ─ signing_timeout ─ resume ─ signing
        any stage no heartbeat >60s ─ stalled ─ user retry ─ resume partial pipeline
        any stage no progress >10min ─ timeout (existing watchdog)
```

## Files touched

- migration: add columns + 1 RPC (no data writes)
- `worker/src/worker.js`, `worker/src/pipeline.js`
- `supabase/functions/pipeline-watchdog/index.ts` (new)
- `supabase/functions/process-app/index.ts` (resume flag)
- `src/hooks/useConversionJob.ts`
- `src/lib/buildStateMachine.ts`
- `src/components/pipeline/BuildPipelineView.tsx`
- `src/components/pipeline/BuildErrorPanel.tsx`
- cron schedule via `supabase--insert`

## Out of scope (explicitly)

- No changes to credit logic, paywall, Kiwify, Stripe.
- No changes to auth, RLS rewrites, or PIN gate.
- No UI redesign beyond the new heartbeat chip / recovery banner / retry button.
