---
name: Security Hardening
description: RLS reforçada, bucket aab-files privado, Edge Functions com auth obrigatória, HIBP ativo
type: feature
---
Políticas de Segurança e RLS:
- **profiles UPDATE**: WITH CHECK bloqueia alteração de plan, credits_balance, ai_credits, bonus_builds, subscription_status, payment_date, daily_builds_count, last_build_date, referral_code, tipo_usuario, status, teste_expira_em
- **aab-files bucket**: PRIVADO. Policies por owner em SELECT/INSERT/UPDATE/DELETE exigem `(storage.foldername(name))[1] = auth.uid()::text`. Path obrigatório: `{user_id}/{job_id}/<file>`. Download via Edge Function `sign-aab-download` (TTL 45 min). Worker recebe signed URL com TTL 60 min via `convert-aab-to-apk`. Validação de magic bytes (PK\x03\x04) + tamanho 256B–20MB.
- **send-email**: Requer Bearer token (service-role, anon key, ou JWT válido)
- **generate-business**: Requer Bearer token + getClaims() válido
- **worker-health**: Requer Bearer token + getClaims() válido
- **auth-reset-password**: Aceita anon key (público por design, mas com token)
- **kiwify-webhook**: Token obrigatório — rejeita se KIWIFY_WEBHOOK_TOKEN não estiver configurado
- **admin-data**: Proteção founder em update_credits e extend_trial
- **sign-aab-download**: Valida JWT + ownership do job (admin/founder via `is_privileged` bypass) antes de assinar URL
- **HIBP (Have I Been Pwned)**: `password_hibp_enabled=true` — bloqueia senhas vazadas no signup/reset
