# Pass Final de Hardening Enterprise — Plano

Este pedido cobre **9 áreas distintas** (CSP, rate limit, payload, webhooks, observabilidade, pipeline resilience, frontend XSS, PWA, testes de regressão). Cada uma é um trabalho substancial; entregar tudo num único loop produziria código superficial e risco real de quebrar monetização, pipeline e auth. Proponho uma execução em **3 ondas priorizadas**, cada uma entregue, validada e revisada antes da próxima.

> **Restrição da plataforma:** rate limiting backend não tem primitivas estabelecidas no Lovable Cloud — implementação será ad-hoc (tabela `rate_limits` + janela deslizante via SQL). Posso fazer, mas você precisa saber que não é infra dedicada.

---

## Onda 1 — Defesas de borda (entrega imediata, baixo risco)

Foco em hardening que **não toca lógica de negócio**.

1. **CSP enterprise** (`index.html`)
   - Remover `'unsafe-eval'`, manter `'unsafe-inline'` apenas para `style-src` (Tailwind/Vite exigem)
   - Adicionar allowlist explícita: Stripe, Kiwify, Google Fonts, Supabase, Lovable AI Gateway
   - `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `form-action 'self'` (já existe)
   - Nota: `'strict-dynamic'` + nonce **não é viável** com Vite SWC sem plugin custom de injeção SSR — explicaria por que estamos pulando isso

2. **Security headers compartilhados em todas as Edge Functions**
   - Aplicar `SECURITY_RESPONSE_HEADERS` (já existe em `_shared/safeFetch.ts`) em: `convert-app`, `convert-aab-to-apk`, `generate-business`, `generate-video`, `send-email`, `kiwify-webhook`, `secure-login`, `auth-reset-password`, `admin-data`, `admin-2fa-*`, `sign-aab-download`, `cleanup-jobs`

3. **Payload limits compartilhados** (`_shared/payloadGuard.ts` novo)
   - `readJsonCapped(req, maxBytes)` — lê body com cap (default 256 KiB)
   - Aplicar em endpoints públicos/AI (`generate-business`, `generate-video`, `convert-app`, `kiwify-webhook`)

4. **`_shared/auditLogger.ts`** (centralized structured logs)
   - Tags `[SECURITY] [AUTH] [PIPELINE] [UPLOAD] [PAYMENT] [VALIDATOR]`
   - `correlationId`, `traceId`, IP hash, UA hash
   - Refatorar `worker-health` e `process-app` para usá-lo

---

## Onda 2 — Rate limit + Webhook hardening (requer migração DB)

5. **Rate limit SQL-based**
   - Migração: tabela `rate_limits (key text, window_start timestamptz, count int)` + função `check_rate_limit(key, max, window_seconds) returns boolean`
   - Helper `_shared/rateLimit.ts` que chama a função
   - Aplicar em: `secure-login` (já tem login_attempts, reusar), `generate-business`, `generate-video`, `convert-app`, `send-email`, `kiwify-webhook`
   - Header `Retry-After` em 429
   - **Limitação honesta:** sem Redis, latência por chamada é maior que ideal (~30-80ms)

6. **Webhook hardening — `kiwify-webhook`**
   - Auditar assinatura existente, adicionar tolerância de timestamp (±5min) se ainda não tiver
   - Dedupe via tabela `webhook_dedupe` (já existe) — validar uso
   - Logar tentativas de replay como `[SECURITY] WEBHOOK_REPLAY`

---

## Onda 3 — Pipeline resilience + Frontend + Testes

7. **Pipeline resilience**
   - `mark_stale_conversion_jobs_as_timeout` já existe — adicionar `pg_cron` (verificar se já está agendado) a cada 5min
   - Cleanup de órfãos no storage (`aab-files`) para jobs > 7 dias em `error`/`timeout`
   - Worker heartbeat: nova coluna `last_heartbeat_at` em `conversion_jobs`, atualizada a cada step

8. **Frontend XSS sweep**
   - Grep por `dangerouslySetInnerHTML` no projeto — auditar cada ocorrência
   - Se houver markdown user-supplied: instalar `dompurify` e wrapper `SafeHtml`
   - Validar que toasts (sonner) não renderizam HTML cru

9. **PWA**
   - Projeto **não tem** service worker registrado (verifiquei: install-only PWA via `useInstallPrompt`). Não há cache poisoning vector. Documentar como "N/A — sem SW" e mover

10. **Testes de regressão** (`supabase/functions/_shared/*.test.ts` + `src/test/security.test.ts`)
    - urlGuard: IPs privados, IPv6, encoded IPs, metadata, DNS rebinding
    - safeFetch: redirect limit, size cap, timeout, cross-origin header strip
    - rateLimit: janela deslizante, burst, retry-after
    - CSP: snapshot test do header

---

## O que **não** vou fazer sem aprovação explícita

- Trocar Vite por SSR para suportar nonce CSP real (mudança de stack)
- Adicionar Redis/Upstash (novo serviço externo, custo)
- Reescrever `kiwify-webhook` se assinatura já está validada (risco de quebrar pagamentos)
- Migrar logs para serviço externo (Datadog/Sentry) — `system_logs` table já existe

---

## Detalhes técnicos (referência)

**Arquivos a criar:**
- `supabase/functions/_shared/auditLogger.ts`
- `supabase/functions/_shared/payloadGuard.ts`
- `supabase/functions/_shared/rateLimit.ts`
- `supabase/functions/_shared/urlGuard.test.ts`
- `supabase/functions/_shared/safeFetch.test.ts`

**Arquivos a editar (Onda 1):**
- `index.html` (CSP)
- ~12 edge functions (security headers, audit logger)

**Migração SQL (Onda 2):**
```sql
CREATE TABLE public.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 0
);
CREATE FUNCTION public.check_rate_limit(_key text, _max int, _window_seconds int)
RETURNS boolean ...;
```

---

## Pergunta antes de começar

**Quer que eu comece pela Onda 1 agora** (CSP + security headers + payload guard + audit logger — ~1 loop, risco baixo, sem migração), e depois você revisa antes da Onda 2?

Ou prefere outra ordenação (ex.: rate limit primeiro porque tem abuso ativo)?
