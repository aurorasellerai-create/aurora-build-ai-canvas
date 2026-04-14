---
name: Security Hardening
description: Políticas RLS reforçadas, Edge Functions com auth obrigatória, webhook com token obrigatório
type: feature
---
Políticas de Segurança e RLS:
- **profiles UPDATE**: WITH CHECK bloqueia alteração de plan, credits_balance, ai_credits, bonus_builds, subscription_status, payment_date, daily_builds_count, last_build_date, referral_code, tipo_usuario, status, teste_expira_em
- **aab-files bucket**: SELECT restrito a `(storage.foldername(name))[1] = auth.uid()::text` (ownership)
- **send-email**: Requer Bearer token (service-role, anon key, ou JWT válido)
- **generate-business**: Requer Bearer token + getClaims() válido
- **worker-health**: Requer Bearer token + getClaims() válido
- **auth-reset-password**: Aceita anon key (público por design, mas com token)
- **kiwify-webhook**: Token obrigatório — rejeita se KIWIFY_WEBHOOK_TOKEN não estiver configurado
- **admin-data**: Proteção founder em update_credits e extend_trial
- **Leaked Password Protection (HIBP)**: Ativada via configure_auth
