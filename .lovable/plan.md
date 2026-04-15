

# Plano: Atualizar Teste do Webhook e Validar Fluxo Completo

## Diagnóstico

O webhook Kiwify está funcionando corretamente em todas as verificações de segurança. O único problema é que o teste automatizado (`index.test.ts`) está desatualizado — ele espera `Access-Control-Allow-Origin: *` mas o webhook agora retorna `https://aurorabuild.com.br` (endurecimento feito anteriormente).

## O que será feito

### 1. Corrigir teste de CORS no `index.test.ts`
Atualizar a asserção do teste "handles OPTIONS" para esperar `https://aurorabuild.com.br` em vez de `*`.

### 2. Executar testes novamente
Rodar os 5 testes para confirmar que todos passam (5/5).

---

**Detalhes técnicos:**

Arquivo: `supabase/functions/kiwify-webhook/index.test.ts`
- Linha 71: trocar `assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*")` por `assertEquals(res.headers.get("Access-Control-Allow-Origin"), "https://aurorabuild.com.br")`

**Nota sobre HMAC:** Para testar pagamentos reais com assinatura válida, a Kiwify enviará o webhook com o header `x-kiwify-signature` usando o token configurado. O fluxo de rejeição está 100% validado — assinaturas inválidas são bloqueadas em todos os cenários.

