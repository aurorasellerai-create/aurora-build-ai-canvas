/**
 * Aurora Build AI — Build Error Intelligence
 *
 * Engine de diagnóstico que transforma logs crus de build em diagnósticos
 * inteligentes (PT-BR) com classificação CRÍTICO / ATENÇÃO / INFO, causa
 * provável, impacto, risco para produção e sugestões automáticas de correção.
 */

import type { ParsedLogLine } from "@/lib/parseBuildLogs";

export type BuildErrorSeverity = "critical" | "warning" | "info";

export type BuildErrorCategory =
  | "dependency_missing"
  | "env_missing"
  | "typescript_error"
  | "build_timeout"
  | "worker_crash"
  | "gradle_failure"
  | "signing_failure"
  | "bundletool_failure"
  | "memory_overflow"
  | "network_timeout"
  | "import_export_error"
  | "route_crash"
  | "react_rendering"
  | "manifest_conflict"
  | "sdk_incompatibility"
  | "unknown";

export interface RecoveryAction {
  type:
    | "install_package"
    | "fix_import"
    | "add_env"
    | "clear_cache"
    | "rebuild"
    | "switch_sdk"
    | "update_deps"
    | "open_docs";
  label: string;
  command?: string;
  url?: string;
}

export interface BuildErrorDiagnosis {
  id: string;
  category: BuildErrorCategory;
  severity: BuildErrorSeverity;
  title: string;
  whatHappened: string;
  impact: string;
  probableCause: string;
  howToFix: string;
  productionRisk: string;
  recovery: RecoveryAction[];
  sourceLine?: ParsedLogLine;
  /** Linhas brutas relevantes para o painel "Ver logs completos". */
  evidence: string[];
}

interface CategoryRule {
  category: BuildErrorCategory;
  severity: BuildErrorSeverity;
  title: string;
  matchers: RegExp[];
  whatHappened: string;
  impact: string;
  probableCause: string;
  howToFix: string;
  productionRisk: string;
  recovery: (match: RegExpMatchArray | null) => RecoveryAction[];
}

const RULES: CategoryRule[] = [
  {
    category: "dependency_missing",
    severity: "critical",
    title: "Dependência ausente",
    matchers: [
      /Cannot find module ['"]([^'"]+)['"]/i,
      /Module not found: .+'([^']+)'/i,
      /npm ERR! 404 .+ '([^']+)'/i,
    ],
    whatHappened:
      "O build foi interrompido porque um pacote referenciado no código não está instalado.",
    impact: "A compilação não consegue resolver imports e aborta antes de gerar o artefato.",
    probableCause:
      "O pacote foi adicionado ao código mas não ao package.json, ou o node_modules está corrompido.",
    howToFix:
      "Instale o pacote ausente ou remova o import. Em seguida, rode o build novamente.",
    productionRisk:
      "Alto. Sem o pacote, o app não roda em produção e o pipeline nunca conclui.",
    recovery: (m) => [
      {
        type: "install_package",
        label: m?.[1] ? `Instalar ${m[1]}` : "Instalar dependência",
        command: m?.[1] ? `npm install ${m[1]}` : "npm install",
      },
      { type: "clear_cache", label: "Limpar cache", command: "npm cache clean --force" },
      { type: "rebuild", label: "Rebuild" },
    ],
  },
  {
    category: "env_missing",
    severity: "critical",
    title: "Variável de ambiente ausente",
    matchers: [
      /(?:Missing|undefined) (?:env|environment) (?:var(?:iable)?\s*)?([A-Z][A-Z0-9_]+)/,
      /process\.env\.([A-Z0-9_]+) is (?:undefined|not defined)/,
      /([A-Z][A-Z0-9_]{4,}) is required/,
    ],
    whatHappened:
      "Uma variável de ambiente obrigatória não foi encontrada no momento do build.",
    impact:
      "Funcionalidades dependentes (Supabase, Kiwify, APIs externas) deixam de funcionar.",
    probableCause:
      "A variável não foi configurada no Lovable Cloud ou tem nome diferente do esperado.",
    howToFix:
      "Adicione a variável em Configurações → Variáveis de Ambiente e refaça o build.",
    productionRisk: "Alto. Pode quebrar autenticação, pagamentos ou integrações críticas.",
    recovery: (m) => [
      {
        type: "add_env",
        label: m?.[1] ? `Configurar ${m[1]}` : "Configurar variável",
      },
      { type: "rebuild", label: "Rebuild após salvar" },
    ],
  },
  {
    category: "typescript_error",
    severity: "critical",
    title: "Erro de compilação TypeScript",
    matchers: [/error TS\d{3,5}:/i, /Type '.+' is not assignable to type '.+'/i],
    whatHappened: "O TypeScript detectou um erro de tipo que impede a compilação.",
    impact: "O bundle não é gerado e o build falha imediatamente.",
    probableCause:
      "Tipo divergente, propriedade inexistente, ou contrato de função alterado em um arquivo recente.",
    howToFix:
      "Abra o arquivo apontado, ajuste o tipo ou a chamada. Evite usar 'any' em produção.",
    productionRisk: "Médio. Quebra o pipeline mas não afeta produção até o próximo deploy.",
    recovery: () => [
      { type: "fix_import", label: "Abrir arquivo com erro" },
      {
        type: "open_docs",
        label: "Guia TypeScript",
        url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
      },
    ],
  },
  {
    category: "build_timeout",
    severity: "critical",
    title: "Build excedeu o tempo limite",
    matchers: [/build.*(timed out|timeout)/i, /ETIMEDOUT/i, /timeout|tempo.*(esgotado|limite)|excedeu.*tempo/i],
    whatHappened:
      "O pipeline foi cancelado automaticamente porque ultrapassou o tempo máximo permitido.",
    impact: "Nenhum artefato é produzido. Pode indicar loop ou worker sobrecarregado.",
    probableCause:
      "Build muito grande, worker lento, deadlock no Gradle ou rede instável durante downloads.",
    howToFix:
      "Limpe cache, reinicie o worker e tente novamente. Reduza assets pesados se persistir.",
    productionRisk: "Alto se recorrente — bloqueia publicações.",
    recovery: () => [
      { type: "clear_cache", label: "Limpar cache do build" },
      { type: "rebuild", label: "Tentar novamente" },
    ],
  },
  {
    category: "worker_crash",
    severity: "critical",
    title: "Worker do build crashou",
    matchers: [
      /worker (crashed|exited|disconnect)/i,
      /SIGKILL|SIGTERM|Killed/,
      /Cannot connect to worker/i,
    ],
    whatHappened: "O processo worker que executa o build foi encerrado de forma inesperada.",
    impact: "O job é marcado como falho. Nenhum AAB/APK é gerado.",
    probableCause:
      "Falta de memória, restart do container, ou crash no script de pipeline.",
    howToFix:
      "Aguarde o auto-restart e tente novamente. Reduza paralelismo se acontecer com frequência.",
    productionRisk: "Alto. Indica instabilidade na infraestrutura de build.",
    recovery: () => [
      { type: "rebuild", label: "Retry build" },
      {
        type: "open_docs",
        label: "Status Aurora Cloud",
        url: "https://aurorabuild.com.br",
      },
    ],
  },
  {
    category: "gradle_failure",
    severity: "critical",
    title: "Falha na compilação Gradle",
    matchers: [/FAILURE: Build failed/, /Execution failed for task ':app:.+'/, /Gradle build failed/i],
    whatHappened: "O Gradle não conseguiu compilar o projeto Android nativo.",
    impact: "Sem APK/AAB. Pode quebrar publicações futuras até ser resolvido.",
    probableCause:
      "Versão de SDK incompatível, plugin Capacitor desatualizado ou conflito de dependências Android.",
    howToFix:
      "Atualize as dependências Capacitor/Android e revise plugins recentemente instalados.",
    productionRisk: "Alto. Builds Android ficam indisponíveis.",
    recovery: () => [
      { type: "update_deps", label: "Atualizar dependências" },
      { type: "clear_cache", label: "Limpar cache Gradle", command: "./gradlew clean" },
      { type: "rebuild", label: "Rebuild" },
    ],
  },
  {
    category: "signing_failure",
    severity: "critical",
    title: "Falha na assinatura digital",
    matchers: [/jarsigner|apksigner|keystore.*not.*found|Failed to sign/i],
    whatHappened: "A etapa de assinatura do bundle Android falhou.",
    impact:
      "O AAB/APK não pode ser publicado na Play Store sem assinatura válida v1/v2/v3.",
    probableCause:
      "Keystore inválido, senha incorreta ou algoritmo não suportado.",
    howToFix:
      "Verifique as credenciais do keystore e confirme que está acessível ao worker.",
    productionRisk: "Crítico. Bloqueia totalmente a publicação na Play Store.",
    recovery: () => [
      {
        type: "open_docs",
        label: "Guia de assinatura Android",
        url: "https://developer.android.com/studio/publish/app-signing",
      },
      { type: "rebuild", label: "Tentar nova assinatura" },
    ],
  },
  {
    category: "bundletool_failure",
    severity: "critical",
    title: "Falha no bundletool",
    matchers: [/bundletool.*(error|failed)/i, /Invalid app bundle/i],
    whatHappened:
      "O bundletool não conseguiu gerar/validar o Android App Bundle (AAB).",
    impact: "Sem AAB válido, a publicação na Play Store é impossível.",
    probableCause:
      "Estrutura inválida do bundle, recurso ausente ou versão antiga do bundletool.",
    howToFix:
      "Atualize bundletool, valide manifests e tente um build limpo.",
    productionRisk: "Alto. Pipeline AAB inutilizado.",
    recovery: () => [
      { type: "update_deps", label: "Atualizar bundletool" },
      { type: "rebuild", label: "Rebuild" },
    ],
  },
  {
    category: "memory_overflow",
    severity: "critical",
    title: "Memória insuficiente",
    matchers: [/JavaScript heap out of memory/i, /OutOfMemoryError/i, /Killed/],
    whatHappened: "O processo de build esgotou a memória disponível.",
    impact: "Worker crasha e o pipeline aborta.",
    probableCause:
      "Bundle muito grande, dependências pesadas ou heap Node mal configurado.",
    howToFix:
      "Aumente o limite com NODE_OPTIONS=--max-old-space-size=4096 e otimize imports.",
    productionRisk: "Alto se acontecer com frequência.",
    recovery: () => [
      { type: "clear_cache", label: "Limpar cache" },
      { type: "rebuild", label: "Rebuild" },
    ],
  },
  {
    category: "network_timeout",
    severity: "warning",
    title: "Timeout de rede",
    matchers: [/ECONNRESET|ENOTFOUND|ETIMEDOUT/i, /network.*timeout/i, /fetch failed/i],
    whatHappened: "Uma requisição de rede do build falhou por timeout.",
    impact: "Pode causar dependências corrompidas ou downloads incompletos.",
    probableCause: "Instabilidade da rede ou do servidor remoto (npm, Maven, etc.).",
    howToFix: "Aguarde alguns minutos e tente novamente.",
    productionRisk: "Médio. Geralmente é transitório.",
    recovery: () => [
      { type: "rebuild", label: "Retry" },
      { type: "clear_cache", label: "Limpar cache" },
    ],
  },
  {
    category: "import_export_error",
    severity: "critical",
    title: "Erro de import/export",
    matchers: [
      /export ['"][^'"]+['"] is not defined/i,
      /does not provide an export named ['"][^'"]+['"]/i,
      /Unexpected token .*'export'|'import'/,
    ],
    whatHappened: "Um import ou export referencia algo inexistente.",
    impact: "O bundler não consegue resolver módulos e aborta.",
    probableCause: "Renomeação não propagada, default export trocado por named ou vice-versa.",
    howToFix: "Confirme assinaturas de exportação no arquivo apontado.",
    productionRisk: "Médio. Quebra build, mas é correção pontual.",
    recovery: () => [{ type: "fix_import", label: "Corrigir import" }],
  },
  {
    category: "route_crash",
    severity: "warning",
    title: "Crash em rota React",
    matchers: [/Error: .*at Route/i, /react-router.*error/i],
    whatHappened: "Uma rota lançou erro durante a renderização.",
    impact: "Usuários podem ver tela em branco ou ErrorBoundary nessa rota.",
    probableCause:
      "Componente da rota acessa dado nulo ou hook fora de ordem.",
    howToFix: "Adicione verificações de null e revise hooks do componente afetado.",
    productionRisk: "Médio. Funcionalidades específicas podem ficar indisponíveis.",
    recovery: () => [{ type: "fix_import", label: "Abrir rota afetada" }],
  },
  {
    category: "react_rendering",
    severity: "warning",
    title: "Erro de renderização React",
    matchers: [
      /Objects are not valid as a React child/i,
      /Rendered more hooks than during the previous render/i,
      /Cannot update a component while rendering a different component/i,
    ],
    whatHappened: "O React detectou uso inválido durante a renderização.",
    impact: "Pode causar telas em branco, loops ou warnings persistentes.",
    probableCause: "Hooks condicionais, objetos passados como children ou setState dentro de render.",
    howToFix: "Refatore o componente para seguir as regras dos hooks.",
    productionRisk: "Médio. Estabilidade da UI afetada.",
    recovery: () => [
      {
        type: "open_docs",
        label: "Regras dos Hooks",
        url: "https://react.dev/reference/rules/rules-of-hooks",
      },
    ],
  },
  {
    category: "manifest_conflict",
    severity: "warning",
    title: "Conflito no AndroidManifest",
    matchers: [/Manifest merger failed/i, /AndroidManifest\.xml.*conflict/i],
    whatHappened: "O merger do AndroidManifest detectou entradas conflitantes.",
    impact: "Build Android falha ou app instala com permissões erradas.",
    probableCause: "Dois plugins declaram a mesma permissão/atividade de forma incompatível.",
    howToFix: "Use tools:replace ou remova o plugin redundante.",
    productionRisk: "Alto se for publicado: pode ser rejeitado pela Play Store.",
    recovery: () => [
      { type: "update_deps", label: "Revisar plugins" },
      {
        type: "open_docs",
        label: "Guia Manifest Merger",
        url: "https://developer.android.com/build/manage-manifests",
      },
    ],
  },
  {
    category: "sdk_incompatibility",
    severity: "warning",
    title: "Incompatibilidade de SDK",
    matchers: [
      /compileSdkVersion.*requires/i,
      /minSdkVersion.*cannot.*lower/i,
      /targetSdkVersion .* not supported/i,
    ],
    whatHappened: "Uma versão do SDK Android não é compatível com o restante do projeto.",
    impact: "Build falha ou app não roda nas versões esperadas de Android.",
    probableCause: "Plugin recente exige compileSdk/targetSdk mais alto que o configurado.",
    howToFix: "Atualize compileSdk/targetSdk no build.gradle.",
    productionRisk: "Alto. Play Store exige targetSdk atualizado anualmente.",
    recovery: () => [{ type: "switch_sdk", label: "Atualizar SDK" }],
  },
];

function fingerprint(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function buildDiagnosis(
  rule: CategoryRule,
  match: RegExpMatchArray | null,
  sourceLine: ParsedLogLine | undefined,
  evidence: string[],
): BuildErrorDiagnosis {
  return {
    id: fingerprint(`${rule.category}-${sourceLine?.message ?? ""}`),
    category: rule.category,
    severity: rule.severity,
    title: rule.title,
    whatHappened: rule.whatHappened,
    impact: rule.impact,
    probableCause: rule.probableCause,
    howToFix: rule.howToFix,
    productionRisk: rule.productionRisk,
    recovery: rule.recovery(match),
    sourceLine,
    evidence,
  };
}

/**
 * Analisa um conjunto de logs e retorna diagnósticos únicos por categoria.
 */
export function analyzeBuildLogs(lines: ParsedLogLine[]): BuildErrorDiagnosis[] {
  const found = new Map<string, BuildErrorDiagnosis>();

  for (const line of lines) {
    for (const rule of RULES) {
      for (const re of rule.matchers) {
        const m = line.message.match(re);
        if (!m) continue;
        const key = rule.category;
        if (found.has(key)) {
          found.get(key)!.evidence.push(line.message);
          continue;
        }
        const evidence = [line.message];
        found.set(key, buildDiagnosis(rule, m, line, evidence));
      }
    }
  }

  return Array.from(found.values()).sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
}

/**
 * Diagnostica a partir de uma mensagem de erro livre (ex.: campo
 * `errorMessage` de um job). Usado quando não há logs estruturados.
 */
export function analyzeRawErrorMessage(message: string): BuildErrorDiagnosis {
  const line: ParsedLogLine = {
    raw: message,
    source: "stderr",
    level: "error",
    message,
    lineIndex: 0,
  };
  const results = analyzeBuildLogs([line]);
  if (results.length) return results[0];
  return {
    id: fingerprint(message),
    category: "unknown",
    severity: "warning",
    title: "Falha não classificada no build",
    whatHappened: message || "Pipeline interrompido por erro não identificado.",
    impact: "Build não foi concluído. O artefato final não está disponível.",
    probableCause: "Erro sem assinatura conhecida. Pode ser transitório.",
    howToFix:
      "Veja os logs completos abaixo, copie a mensagem e tente novamente. Se persistir, abra um chamado.",
    productionRisk: "Indeterminado.",
    recovery: [
      { type: "rebuild", label: "Tentar novamente" },
      { type: "clear_cache", label: "Limpar cache" },
    ],
    sourceLine: line,
    evidence: [message],
  };
}

function severityWeight(s: BuildErrorSeverity): number {
  return s === "critical" ? 3 : s === "warning" ? 2 : 1;
}

export const SEVERITY_LABEL: Record<BuildErrorSeverity, string> = {
  critical: "Crítico",
  warning: "Atenção",
  info: "Info",
};
