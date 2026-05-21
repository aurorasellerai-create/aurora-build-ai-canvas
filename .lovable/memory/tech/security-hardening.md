---
name: Security Hardening
description: RLS reforçada, bucket aab-files privado, Edge Functions com auth obrigatória, HIBP ativo, webhook dedupe durável
type: feature
---
Políticas de Segurança e RLS:
- **profiles UPDATE**: WITH CHECK bloqueia alteração de plan, credits_balance, ai_credits, bonus_builds, subscription_status, payment_date, daily_builds_count, last_build_date, referral_code, tipo_usuario, status, teste_expira_em
- **aab-files bucket**: PRIVADO. Policies por owner em SELECT/INSERT/UPDATE/DELETE exigem `(storage.foldername(name))[1] = auth.uid()::text`. Path obrigatório: `{user_id}/{job_id}/<file>`. Download via Edge Function `sign-aab-download` (TTL 45 min). Worker recebe signed URL com TTL 60 min via `convert-aab-to-apk`. Validação de magic bytes (PK\x03\x04) + tamanho 256B–20MB.
- **send-email**: Requer Bearer token (service-role, anon key, ou JWT válido)
- **generate-business / worker-health**: Bearer token + getClaims() válido
- **auth-reset-password**: Aceita anon key (público por design, com token)
- **kiwify-webhook**: Token obrigatório (HMAC-SHA256 + fallback constant-time). Dedupe durável cross-isolate via `public.webhook_dedupe` (unique `(provider, provider_transaction_id)`, expires 7d, cleanup diário `pg_cron 03:30 UTC` via `public.cleanup_webhook_dedupe`). Parser `parseCurrencyToCents` cobre pt-BR/en-US (39,90 · 1.234,56 · 2,499.99) com 7 testes Deno. Falhas de email gravadas em `system_logs` (severity warning/error).
- **admin-data**: Proteção founder em update_credits e extend_trial
- **sign-aab-download**: Valida JWT + ownership do job (admin/founder via `is_privileged` bypass) antes de assinar URL
- **HIBP (Have I Been Pwned)**: `password_hibp_enabled=true` — bloqueia senhas vazadas no signup/reset
