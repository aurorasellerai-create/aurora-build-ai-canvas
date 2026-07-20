# Aurora Validator AI — Refactor definitivo (dados 100% reais)

Vou construir o parser real do AAB, uma única fonte de verdade (Analysis Service), Edge Function de explicações contextuais e migrar os 4 componentes de UI para consumir apenas esses dados. Escopo grande — divido em 5 etapas executadas sequencialmente numa mesma entrega.

## 1. Backend — parser real do AAB

**Nova Edge Function `analyze-aab`** (Deno). Recebe `{ storage_path, project_id? }`, baixa o AAB do bucket privado `aab-files` via signed URL, e:

- Abre o AAB como ZIP (`jsr:@zip-js/zip-js`).
- Decodifica `base/manifest/AndroidManifest.xml` (binário AXML) com um decoder JS puro (biblioteca `npm:app-info-parser`/AXML fallback inline) → package, versionCode/Name, min/target/compileSdk, permissões, activities, services, receivers, providers, intent-filters (deep links), `usesCleartextTraffic`, `networkSecurityConfig`, `exported`, backup flags.
- Extrai `BundleConfig.pb` (protobuf mínimo) para descobrir splits/densities/languages.
- Lê `META-INF/*.RSA|EC|DSA` → assinatura (esquema v1/v2/v3), issuer, valid-from/to, algoritmo.
- Enumera `base/dex/*` — hashes SHA-256 e tamanho (não desassembla, mas gera evidência).
- Detecta SDKs por presença de arquivos/resources: `firebase-*`, `google-play-services`, `admob`, `facebook`, `onesignal`, `crashlytics`, `revenuecat`, `stripe`, etc.
- Detecta APIs sensíveis: cleartext, `MANAGE_EXTERNAL_STORAGE`, `REQUEST_INSTALL_PACKAGES`, foreground services sem `foregroundServiceType`, background location, health/accessibility, deep links sem `autoVerify`, exports permissivos.
- Calcula score real com fórmula publicada (peso por severidade × itens avaliados).
- Persiste resultado em `validator_analyses` (nova tabela) + emite Realtime.

Timeout hard 45s, cap 500MB (já suportado no upload). Zero acesso do worker Node — mantém tudo em Edge Function, mais simples e sem depender do worker. Se um AAB grande exigir análise profunda extra (DEX symbols, resources.arsc), fica marcado como `deep_scan_pending` e um endpoint futuro do worker completa — nada bloqueante nesta rodada.

## 2. Banco — fonte única

Migração cria:
- `validator_analyses` (user_id, project_id?, storage_path, file_hash, package_name, version_name, version_code, min_sdk, target_sdk, compile_sdk, manifest jsonb, permissions jsonb, sdks jsonb, apis jsonb, deep_links jsonb, signature jsonb, findings jsonb, score int, score_breakdown jsonb, status, error, correlation_id).
- Cache por `file_hash` (SHA-256 do AAB) — reanalisar mesmo arquivo devolve resultado sem reprocessar.
- RLS: dono lê/escreve; admin lê tudo. GRANTs corretos. Realtime habilitado.
- `validator_ai_explanations` (analysis_id, finding_key, source, explanation jsonb, model, created_at) — cache das explicações IA para não recomputar.

## 3. Analysis Service (fonte única no frontend)

`src/lib/validatorAnalysisService.ts`:
- `startAnalysis(file, format)` → upload + invoke `analyze-aab` + retorna id.
- `useAnalysis(id)` → hook React Query + Realtime na `validator_analyses`.
- `useLatestAnalysis(userId)` → última análise concluída (para landing e histórico).
- Tipos TS derivados do schema real (`AnalysisResult`, `Finding`, `ManifestData`, `Signature`, `SdkDetection`, etc.).
- Substitui `validatorHistory` + `validatorRemoteHistory` sem duplicação — mantém API pública compatível encapsulando por dentro.

## 4. Explicações IA contextuais

**Edge Function `explain-finding`**:
- Input: `{ analysis_id, finding_key }`.
- Server-side: procura primeiro em `permissionsKnowledgeBase` (curada, links oficiais confiáveis). Se existir, chama Lovable AI (`google/gemini-3-flash-preview`) só para **reescrever** com contexto do AAB analisado (packageName, targetSdk, arquivo onde apareceu, elementos manifest relacionados) — usa a KB como grounding para não alucinar links. Se **não** existir na KB, gera 100% via IA com prompt reforçado exigindo referência oficial verificável.
- Retorna JSON estruturado: `{ explanation, impact, playStoreRisk, securityRisk, recommendation: { steps[], manifestSnippet, codeSnippet, androidCompat[] }, docs, playStorePolicy }`.
- Persiste em `validator_ai_explanations` (cache por `analysis_id + finding_key`).
- Trata 429/402 com fallback para versão heurística (nunca quebra a UI).

`generateAiExplanation.ts` vira thin client que chama a Edge Function via React Query + cache local. Textos fixos removidos — heurística só como fallback de erro.

## 5. UI — migração dos 4 componentes

- **`ValidatorUpload.tsx`**: `createAuroraValidatorResult()` removido. Após upload, chama `startAnalysis()`, guarda `analysis_id`, navega para `/validator/:id`.
- **`ValidatorDetail.tsx`**: consome `useAnalysis(id)`. Renderiza manifest real, permissões reais com severidade real, deep links reais, assinatura real, SDKs reais, findings reais. Score vindo do backend com breakdown clicável (fórmula visível). Botões "Documentação"/"Política Play Store" recebem URL do finding (não mais genérico). Auto-fix panel mostra correções específicas por finding.
- **`AiExplanationCard.tsx` + `generateAiExplanation.ts`**: chamam `explain-finding`. Cada card mostra: onde foi encontrado (arquivo + elemento manifest), qual regra Android, política Play Store relacionada, impacto, risco, passos de correção (com snippets), compat Android 13/14/15.
- **`ValidatorPremium.tsx`**: consome o mesmo `useAnalysis(id)` — zero lógica duplicada. Cards before/after usam findings resolvidos vs pendentes.
- **`AuroraValidatorSection.tsx`** (landing): se usuário logado tiver análise concluída, mostra a real com badge "Sua última análise"; senão, mostra exemplo estático claramente rotulado "Exemplo — envie um AAB para análise real". `createAuroraValidatorResult` sobrevive apenas nesse modo demo e é renomeado para `getValidatorDemoData` para deixar explícito.
- **`auroraValidator.ts`**: convertido em módulo de demo + tipos compartilhados. Nenhum outro componente importa `createAuroraValidatorResult` fora da landing.

## 6. Testes e validação

- Vitest para o AXML decoder e o score calculator com fixtures de manifests reais.
- Teste E2E manual: subo 2 AABs distintos (um app simples + um com Firebase/permissões sensíveis), confirmo relatórios diferentes, links por finding, textos IA únicos por app.
- Report final no chat: arquivos alterados, componentes migrados, evidência de dois AABs produzindo saídas diferentes.

## Detalhes técnicos

- **Sem worker novo**: parser roda inteiro em Edge Function (limite Deno funciona bem até 500MB usando streaming + `ReadableStream`).
- **AXML decoder**: implementação inline (~180 linhas) baseada no formato Android binary XML — não depende de pacote instável. Fallback para `npm:app-info-parser@0.6.5` se disponível no runtime Deno.
- **Score**: `score = 100 − Σ(peso_severidade × count)` com pesos 15/5/1 (critical/warning/info), clampado 0–100. Breakdown persistido.
- **Cache**: file_hash SHA-256 evita reprocessar; analysis_id + finding_key evita reexplicar.
- **Realtime**: `postgres_changes` em `validator_analyses` no cliente durante `status='processing'`.
- **Segurança**: bucket `aab-files` permanece privado; Edge Function usa service role só para signed URL de leitura + insert do resultado.
- **Rollback seguro**: nenhum componente atual é deletado — `createAuroraValidatorResult` só é despromovido para demo. Se algo quebrar, é reversível.

Ao aprovar, executo etapas 1→6 nesta ordem numa sequência de turnos, com validação de build a cada etapa antes da próxima.