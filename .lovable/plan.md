# Painel de Segurança Premium — `/admin`

Stack: Lovable Cloud (Supabase) + Edge Functions Deno. Sem Firebase (incompatível com o resto do app).

---

## 1. Banco de dados (1 migration)

**Novas tabelas**

- `admin_2fa` — `user_id (PK)`, `secret_encrypted`, `enabled`, `backup_codes` (jsonb, hash), `last_used_at`, `created_at`
- `admin_audit_log` — `id`, `admin_id`, `action` (enum text: `login`, `logout`, `view`, `update`, `delete`, `2fa_enable`, `2fa_disable`, `role_change`, `credit_grant`, `setting_change`), `target_type`, `target_id`, `ip`, `user_agent`, `metadata` (jsonb), `created_at`
- `security_alerts` — `id`, `admin_id`, `kind` (`new_ip`, `new_country`, `brute_force`, `2fa_failed`, `impossible_travel`), `severity` (`info|warn|critical`), `ip`, `user_agent`, `details` (jsonb), `acknowledged`, `created_at`

**Extensão de `login_attempts`**: adicionar `ip` e `user_agent` (mantém `ip_hint` por compatibilidade).

**RLS**: somente `admin`/`founder` lê; INSERT bloqueado para clientes (escrita só por edge functions com service role).

**RPCs SECURITY DEFINER**
- `log_admin_action(action, target_type, target_id, metadata)` — lê IP/UA do contexto da function
- `acknowledge_alert(alert_id)`
- `is_known_admin_ip(admin_id, ip)` → bool

---

## 2. Edge Functions

- **`admin-2fa-setup`** — gera secret TOTP (RFC 6238), retorna `otpauth://` URI + QR-data. Não habilita ainda.
- **`admin-2fa-verify`** — recebe código de 6 dígitos, valida com janela ±1, marca `enabled=true`, gera 8 backup codes (hash SHA-256, retorna em texto **uma única vez**).
- **`admin-2fa-disable`** — exige código TOTP ou backup code para desativar.
- **`secure-login`** (existente) — estender:
  1. Captura `x-forwarded-for` e `user-agent`
  2. Se admin tem 2FA → retorna `{requires_2fa: true}` em vez de sessão
  3. Cliente envia segundo passo com código → valida e devolve sessão
  4. Grava `login_attempts` com IP/UA
  5. Cria `security_alerts` se IP nunca visto antes para este admin
  6. Cria entrada em `admin_audit_log` com `action=login`
- **`admin-logout`** — registra `action=logout` no audit + `auth.signOut` server-side da sessão atual.

Lib TOTP: implementação inline ~60 linhas (HMAC-SHA1, base32) — sem dependências.

---

## 3. Frontend

**Atualização do `AdminPinGate`** (login)
- Após e-mail+senha, se `requires_2fa` → mostra tela de código 6 dígitos (campos OTP) + opção "usar backup code"
- Bloqueio após 5 falhas de 2FA por 15 min (mesma lógica de `check_login_rate_limit`)

**Nova seção `AdminSecurity.tsx`** (`/admin → Segurança`)

Layout futurista, cards com gradiente neon-azul/dourado, glassmorphism, animações framer-motion:

- **Card 2FA** — status (ativo/inativo), botão "Configurar" abre modal com QR + verificação. Lista backup codes.
- **Tabela "Tentativas de login"** — últimas 50, com IP, UA truncado, sucesso/falha, timestamp.
- **Tabela "Auditoria de ações"** — filtros por admin, ação, período. Exportar CSV.
- **Painel "Alertas de segurança"** — chips coloridos por severidade, botão "Reconhecer". Pulse animation em criticais não vistos.
- **Stats hero** (4 cards): admins ativos · logins 24h · alertas pendentes · IPs únicos 7d.

**Adições no header do AdminLayout**
- Badge com contador de alertas críticos não reconhecidos (sino com pulse vermelho)

**Hook `useAdminAuditLogger`**
- Wrappers para mutations admin (alterar plano, créditos, settings) que automaticamente chamam `log_admin_action`.

---

## 4. Anti brute force (reforço)

Já existe rate limit por e-mail. Adicionar:
- Limite por IP: 10 tentativas/15 min em qualquer e-mail
- Bloqueio de 1h após 20 falhas seguidas em uma janela de 1h (mesmo IP)
- Cron job `pg_cron` diário para limpar `login_attempts` > 30 dias e gerar alerta se padrão suspeito (>50 falhas/dia em um e-mail)

---

## 5. Alertas de login suspeito

Regras (avaliadas no `secure-login` após sucesso):
- **`new_ip`** (info) — IP nunca registrado para este admin
- **`brute_force`** (warn) — ≥5 falhas nos últimos 15 min antes do sucesso
- **`impossible_travel`** (critical) — login bem-sucedido com IP em geo diferente do anterior em < 1h (geo via cabeçalho `cf-ipcountry` se disponível, senão pula)
- Notificação opcional por e-mail (via `send-email`) ao admin afetado para `critical`

---

## 6. Visual

Mantém Aurora Build AI:
- Cards `card-aurora` com borda animada
- Cores: `--primary` (#FFD700), `--secondary` (cyan)
- Ícones lucide: ShieldCheck, Lock, KeyRound, Smartphone (2FA), History, AlertTriangle, MapPin
- Tabelas com `Table` shadcn já existente
- Modal 2FA com QR renderizado client-side via `qrcode` (lib leve, ~10kb)

---

## Arquivos

**Novos**
- `supabase/functions/admin-2fa-setup/index.ts`
- `supabase/functions/admin-2fa-verify/index.ts`
- `supabase/functions/admin-2fa-disable/index.ts`
- `supabase/functions/admin-logout/index.ts`
- `src/components/admin/AdminSecurity.tsx`
- `src/components/admin/Admin2FASetup.tsx`
- `src/hooks/useAdminAuditLogger.ts`
- `src/lib/totp.ts` (helpers client p/ exibir backup codes)

**Editados**
- 1 migration SQL
- `supabase/functions/secure-login/index.ts`
- `src/components/admin/AdminPinGate.tsx` (passo 2FA)
- `src/components/admin/AdminLayout.tsx` (badge alertas + nova entrada)
- `src/pages/Admin.tsx` (rota interna `security`)

**Dependência nova**
- `qrcode` (~10kb gz) para renderizar QR do 2FA

---

## Decisões a confirmar antes de eu começar

1. **2FA** — TOTP (Google Authenticator/Authy/1Password) está OK, ou prefere código por e-mail?
2. **Geo-IP** — usar só `cf-ipcountry` (grátis, vem do CDN) ou integrar serviço pago (ip-api/ipinfo)?
3. **Notificação de alertas críticos** — enviar e-mail automático ao admin, ou só mostrar no painel?
4. **Escopo de auditoria** — registrar **toda** ação admin (clicks de visualização inclusive) ou só mutações (alterações em users, plans, créditos, settings)?

Confirme essas 4 e eu implemento o pacote completo na sequência.