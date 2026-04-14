

# AUDITORIA DE SEGURANCA - Aurora Build
## Relatorio Completo de Analise Ofensiva

---

## 1. RESUMO EXECUTIVO

A aplicacao Aurora Build apresenta **3 vulnerabilidades criticas exploraveis imediatamente**, **5 de alto risco** e diversas de medio/baixo risco. Os vetores mais perigosos sao:

1. **Escalacao de privilegios via UPDATE no profile** — qualquer usuario autenticado pode se tornar "vip" ou alterar `tipo_usuario` e `status` diretamente via API Supabase
2. **Acesso a arquivos AAB de outros usuarios** — bucket publico sem verificacao de ownership no SELECT
3. **Admin protegido apenas por PIN client-side hardcoded** — qualquer usuario autenticado acessa `/admin` manipulando localStorage
4. **Webhook Kiwify sem validacao criptografica robusta** — assinatura comparada como string simples, sem HMAC
5. **Edge Functions sem autenticacao** (`send-email`, `auth-reset-password`, `generate-business`, `worker-health`) — acessiveis publicamente

---

## 2. TOP 10 VULNERABILIDADES CRITICAS

| # | Vulnerabilidade | Risco | Explorabilidade |
|---|----------------|-------|-----------------|
| 1 | **Escalacao de privilegios via profiles UPDATE** — campos `tipo_usuario` e `status` nao estao no WITH CHECK do RLS | CRITICO | Trivial — uma chamada `supabase.from('profiles').update({tipo_usuario:'vip'})` |
| 2 | **PIN admin hardcoded no client** — `const ADMIN_PIN = "746454"` em `AdminPinGate.tsx`, bypass via `localStorage.setItem('admin_auth','true')` | CRITICO | Trivial — DevTools > Console |
| 3 | **Bucket `aab-files` expoe arquivos de outros usuarios** — SELECT policy verifica apenas `bucket_id`, nao ownership | CRITICO | Trivial — `supabase.storage.from('aab-files').list()` |
| 4 | **`send-email` sem autenticacao** — aceita qualquer request POST, permite spam massivo via Resend | ALTO | Facil — `curl POST /functions/v1/send-email` |
| 5 | **`auth-reset-password` sem autenticacao** — qualquer pessoa pode gerar links de recovery para qualquer email | ALTO | Facil — POST com email arbitrario |
| 6 | **`generate-business` sem autenticacao** — nao verifica token, consome creditos da API Lovable sem controle | ALTO | Facil — POST direto |
| 7 | **`worker-health` expoe metricas internas** — sem auth, revela contagem de jobs, status do DB | MEDIO | Trivial — GET direto |
| 8 | **Webhook Kiwify com validacao fraca** — comparacao `===` de string simples, nao HMAC; se `KIWIFY_WEBHOOK_TOKEN` nao esta setado, bypass total | ALTO | Medio — token vazio = sem validacao |
| 9 | **CORS `Access-Control-Allow-Origin: *`** em todas as Edge Functions — permite requests de qualquer dominio | MEDIO | Facil — qualquer site malicioso |
| 10 | **Leaked password protection desativada** — usuarios podem usar senhas ja comprometidas | MEDIO | Indireto |

---

## 3. TABELA DE 50+ ROTAS/ENDPOINTS ANALISADOS

### FRONTEND ROUTES

| # | Rota | Autenticacao | Autorizacao | Falha | Risco |
|---|------|-------------|-------------|-------|-------|
| 1 | `/` (Index) | Publica | N/A | Nenhuma | Baixo |
| 2 | `/auth` | Publica | N/A | Sem rate limiting no login, brute-force possivel | Medio |
| 3 | `/forgot-password` | Publica | N/A | Sem rate limiting | Baixo |
| 4 | `/reset-password` | Publica | N/A | Depende do token no hash, ok | Baixo |
| 5 | `/dashboard` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 6 | `/generator` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 7 | `/generator/create` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 8 | `/generator/site` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 9 | `/generator/convert` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 10 | `/generator/convert-aab` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 11 | `/converter-app` | ProtectedRoute | Apenas `user` | Duplicata de rota (mesma page) | Info |
| 12 | `/generator/legacy` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 13 | `/processing/:id` | ProtectedRoute | Apenas `user` | RLS protege dados, ok | Baixo |
| 14 | `/project/:id` | ProtectedRoute | Apenas `user` | RLS protege dados, ok | Baixo |
| 15 | `/pricing` | Publica | N/A | Ok | Baixo |
| 16 | `/tools` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 17 | `/business` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 18 | `/admin` | ProtectedRoute + PIN | **PIN CLIENT-SIDE HARDCODED** | **CRITICO** — `localStorage.setItem('admin_auth','true')` bypassa | **Critico** |
| 19 | `/video` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 20 | `/carousel` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 21 | `/credits` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 22 | `/historico` | ProtectedRoute | Apenas `user` | Ok | Baixo |
| 23 | `/*` (NotFound) | Publica | N/A | Ok | Baixo |

### EDGE FUNCTIONS (API)

| # | Endpoint | Auth | Falha | Risco |
|---|----------|------|-------|-------|
| 24 | `POST /functions/v1/send-email` | **NENHUMA** | Qualquer pessoa envia e-mails, spam ilimitado | **Alto** |
| 25 | `POST /functions/v1/auth-reset-password` | **NENHUMA** | Gera links de recovery para qualquer e-mail | **Alto** |
| 26 | `POST /functions/v1/generate-business` | **NENHUMA** (nao verifica token) | Consome API Lovable sem auth | **Alto** |
| 27 | `GET /functions/v1/worker-health` | **NENHUMA** | Expoe metricas internas do sistema | **Medio** |
| 28 | `POST /functions/v1/convert-app` | Bearer token + getUser | Ok — validacao Zod de input | Baixo |
| 29 | `POST /functions/v1/process-app` | Service role key | Aceita apenas chamadas internas | Baixo |
| 30 | `POST /functions/v1/cleanup-jobs` | Bearer + has_role('admin') | Ok | Baixo |
| 31 | `POST /functions/v1/admin-data` | Bearer + user_roles check | Ok — verifica admin/founder | Baixo |
| 32 | `POST /functions/v1/admin-data?action=list` | Admin auth | Retorna TODOS os emails de usuarios | Medio |
| 33 | `POST /functions/v1/admin-data?action=metrics` | Admin auth | Ok | Baixo |
| 34 | `POST /functions/v1/admin-data?action=growth` | Admin auth | Ok | Baixo |
| 35 | `POST /functions/v1/admin-data?action=credits` | Admin auth | Ok | Baixo |
| 36 | `POST /functions/v1/admin-data?action=ai_usage` | Admin auth | Ok | Baixo |
| 37 | `POST /functions/v1/admin-data?action=apps` | Admin auth | Ok | Baixo |
| 38 | `POST /functions/v1/admin-data?action=delete_app` | Admin auth | Sem validacao se caller e founder para deletar | Medio |
| 39 | `POST /functions/v1/admin-data?action=financial` | Admin auth | Ok | Baixo |
| 40 | `POST /functions/v1/admin-data?action=logs` | Admin auth | Ok | Baixo |
| 41 | `POST /functions/v1/admin-data?action=get_settings` | Admin auth | Ok | Baixo |
| 42 | `POST /functions/v1/admin-data?action=save_settings` | Admin auth | Whitelist de keys, ok | Baixo |
| 43 | `POST /functions/v1/admin-data?action=update_plan` | Admin auth | Protege founder, ok | Baixo |
| 44 | `POST /functions/v1/admin-data?action=update_credits` | Admin auth | **Sem protecao founder** — admin pode alterar creditos do founder | Medio |
| 45 | `POST /functions/v1/admin-data?action=toggle_admin` | Admin auth | Protege founder, ok | Baixo |
| 46 | `POST /functions/v1/admin-data?action=update_tipo` | Admin auth | Protege founder, ok | Baixo |
| 47 | `POST /functions/v1/admin-data?action=update_status` | Admin auth | Protege founder, ok | Baixo |
| 48 | `POST /functions/v1/admin-data?action=extend_trial` | Admin auth | **Sem protecao founder** | Medio |
| 49 | `POST /functions/v1/admin-data?action=delete_user` | Admin auth | Protege founder, ok | Baixo |
| 50 | `POST /functions/v1/admin-data?action=system_health` | Admin auth | Ok | Baixo |
| 51 | `POST /functions/v1/kiwify-webhook` | Signature/token | **Token opcional**, se nao definido = bypass total | **Alto** |
| 52 | `POST /functions/v1/generate-video` | Bearer + getUser | Ok — valida auth e input | Baixo |

### SUPABASE DIRECT API (via supabase-js client)

| # | Operacao | RLS | Falha | Risco |
|---|----------|-----|-------|-------|
| 53 | `profiles.SELECT` | user_id = auth.uid() | Ok | Baixo |
| 54 | `profiles.INSERT` | user_id = auth.uid() | Ok (trigger auto-cria) | Baixo |
| 55 | `profiles.UPDATE` | **WITH CHECK incompleto** | `tipo_usuario` e `status` nao protegidos — escalacao de privilegios | **Critico** |
| 56 | `profiles.DELETE` | Bloqueado | Ok | Baixo |
| 57 | `projects.SELECT` | user_id = auth.uid() | Ok | Baixo |
| 58 | `projects.UPDATE` | WITH CHECK complexo | Ok — protege status/download/progress | Baixo |
| 59 | `conversion_jobs.SELECT` | user_id = auth.uid() | Ok | Baixo |
| 60 | `conversion_jobs.INSERT` | user_id = auth.uid() | Ok | Baixo |
| 61 | `conversion_jobs.UPDATE` | **Nenhuma policy** | Nenhum usuario pode atualizar (seguro por omissao) | Info |
| 62 | `credit_usage.SELECT` | user_id = auth.uid() | Ok | Baixo |
| 63 | `payments.SELECT` | user_id = auth.uid() | Ok | Baixo |
| 64 | `user_roles.*` | INSERT/UPDATE/DELETE bloqueados | Ok | Baixo |
| 65 | `system_logs.SELECT` | has_role(admin) | Ok | Baixo |
| 66 | `email_logs.SELECT` | has_role(admin/founder) | Ok | Baixo |
| 67 | `storage.objects (aab-files)` | **Apenas bucket_id check** | Qualquer autenticado le arquivos de outros | **Critico** |

---

## 4. CAMINHOS DE ATAQUE REAIS (Step-by-Step)

### Ataque 1: Escalacao para VIP (0 cliques, 30 segundos)
```text
1. Criar conta normal em /auth
2. Abrir DevTools > Console
3. Executar:
   const { supabase } = await import('/src/integrations/supabase/client.ts')
   await supabase.from('profiles').update({ tipo_usuario: 'vip', status: 'ativo' }).eq('user_id', (await supabase.auth.getUser()).data.user.id)
4. Resultado: usuario agora e VIP, pode ter beneficios de trial estendido
```

### Ataque 2: Acesso Admin Completo (10 segundos)
```text
1. Criar conta normal
2. Console: localStorage.setItem('admin_auth', 'true')
3. Navegar para /admin
4. PIN Gate ignorado completamente
5. Nota: admin-data Edge Function VERIFICA roles no backend, entao as acoes admin falharao
   MAS: toda a interface admin renderiza, expondo a estrutura e tentativas de enumeracao
```

### Ataque 3: Download de AAB de Outros Usuarios
```text
1. Criar conta, autenticar
2. Executar: supabase.storage.from('aab-files').list('/')
3. Iterar por todas as pastas (UUIDs de outros usuarios)
4. Baixar arquivos AAB de qualquer usuario
```

### Ataque 4: Spam Massivo via send-email
```text
1. Sem autenticacao necessaria
2. curl -X POST https://[supabase-url]/functions/v1/send-email \
   -H "Content-Type: application/json" \
   -d '{"templateName":"welcome","recipientEmail":"vitima@email.com"}'
3. Repetir em loop — sem rate limiting
4. Dominio aurorabuild.com.br pode ser blacklistado por provedores de email
```

### Ataque 5: Forjar Pagamento Kiwify
```text
1. Se KIWIFY_WEBHOOK_TOKEN nao estiver definido no ambiente:
   curl -X POST https://[url]/functions/v1/kiwify-webhook \
   -d '{"order_status":"paid","Customer":{"email":"atacante@email.com"},"order_id":"fake123","Product":{"name":"premium"}}'
2. Sistema cria usuario, ativa plano Premium, adiciona 500 creditos
3. Mesmo se token existir, a validacao nao usa HMAC — se o token vazar, replay e trivial
```

---

## 5. RECOMENDACOES TECNICAS PRIORITARIAS

### P0 — Corrigir IMEDIATAMENTE (exploraveis agora)

1. **Profiles RLS — adicionar `tipo_usuario` e `status` ao WITH CHECK**
   - SQL: adicionar `AND (tipo_usuario = (SELECT p.tipo_usuario FROM profiles p WHERE p.user_id = auth.uid()))` e o mesmo para `status`

2. **Storage `aab-files` — policy de ownership**
   - Alterar SELECT policy para: `bucket_id = 'aab-files' AND (storage.foldername(name))[1] = auth.uid()::text`

3. **Admin PIN Gate — mover para server-side**
   - Remover PIN hardcoded do client
   - Verificar role `admin`/`founder` no `user_roles` via RLS ou Edge Function
   - Rota `/admin` deve checar role antes de renderizar qualquer componente

4. **Autenticacao em `send-email`**
   - Exigir Bearer token + `getUser()` para chamadas diretas
   - OU: aceitar apenas chamadas com `SUPABASE_SERVICE_ROLE_KEY` (server-to-server)

5. **Autenticacao em `auth-reset-password`**
   - Adicionar rate limiting (ex: 3 requests/minuto por IP ou email)
   - Aceitar apenas anon key com validacao

6. **Autenticacao em `generate-business`**
   - Adicionar Bearer token + getUser() (como `generate-video` ja faz)

### P1 — Corrigir em 1-2 semanas

7. **Kiwify webhook — validacao HMAC**
   - Usar `crypto.subtle.verify` com HMAC-SHA256 em vez de comparacao simples
   - Garantir que `KIWIFY_WEBHOOK_TOKEN` esta SEMPRE definido (falhar se ausente)

8. **Ativar Leaked Password Protection** via `configure_auth`

9. **CORS restritivo** — trocar `*` por `https://aurorabuild.com.br` nas funcoes que nao sao webhooks

10. **Rate limiting no login** — implementar contagem de tentativas por email no backend

11. **`worker-health` — adicionar autenticacao** ou remover dados sensiveis da resposta

12. **`admin-data?action=update_credits` e `extend_trial` — adicionar protecao founder**

### P2 — Melhorias de Seguranca

13. Adicionar headers CSP no index.html
14. Implementar audit log para todas as acoes admin com IP
15. Rotacionar o PIN admin (ou eliminar em favor de roles)
16. Adicionar `listUsers` com paginacao em vez de `perPage: 1000` (DoS potencial)
17. `findOrCreateUser` no webhook itera 1000 usuarios em memoria — usar `getUserByEmail` do admin API

---

**Conclusao**: As 3 vulnerabilidades criticas (escalacao via profiles, acesso a arquivos de outros, admin client-side) sao exploraveis em menos de 1 minuto por qualquer usuario autenticado. As Edge Functions sem auth permitem abuso externo. Recomendo correcao imediata das P0 antes de qualquer novo feature.

