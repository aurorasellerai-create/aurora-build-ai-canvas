export type BuildRecoveryCause =
  | "gradle_freeze"
  | "dependency_conflict"
  | "signing_stuck"
  | "worker_disconnected"
  | "network_timeout"
  | "memory_overflow"
  | "bundletool_crash"
  | "unknown_stall";

export interface BuildRecoveryDiagnosis {
  cause: BuildRecoveryCause;
  title: string;
  summary: string;
  likelyCause: string;
  action: string;
  severity: "critical" | "warning";
}

export interface BuildRecoveryInput {
  status?: string | null;
  stage?: string | null;
  elapsedMs?: number;
  stdout?: string | null;
  stderr?: string | null;
  lastLog?: string | null;
  exitCode?: number | null;
  errorMessage?: string | null;
}

const catalog: Record<BuildRecoveryCause, BuildRecoveryDiagnosis> = {
  gradle_freeze: {
    cause: "gradle_freeze",
    title: "Gradle congelado",
    summary: "A compilação Android ficou sem avanço durante a execução Gradle.",
    likelyCause: "Download Maven travado, daemon Gradle bloqueado ou task Android sem resposta.",
    action: "Reprocessar o build e limpar cache Gradle se o padrão se repetir.",
    severity: "critical",
  },
  dependency_conflict: {
    cause: "dependency_conflict",
    title: "Conflito de dependências",
    summary: "O pipeline encontrou sinais de incompatibilidade entre pacotes Android/Node.",
    likelyCause: "Versões divergentes de plugins, Capacitor, Gradle ou bibliotecas transitivas.",
    action: "Atualizar dependências e refazer o build em ambiente limpo.",
    severity: "critical",
  },
  signing_stuck: {
    cause: "signing_stuck",
    title: "Assinatura travada",
    summary: "O build parou na etapa de assinatura do APK/AAB.",
    likelyCause: "Keystore indisponível, credencial inválida ou processo apksigner preso.",
    action: "Validar credenciais de assinatura e reprocessar.",
    severity: "critical",
  },
  worker_disconnected: {
    cause: "worker_disconnected",
    title: "Worker desconectado",
    summary: "O serviço de build deixou de enviar progresso ou encerrou antes do status final.",
    likelyCause: "Restart do worker, queda de rede interna ou processo encerrado pelo runtime.",
    action: "Reprocessar. O watchdog já finalizou o job para evitar processing infinito.",
    severity: "critical",
  },
  network_timeout: {
    cause: "network_timeout",
    title: "Timeout de rede",
    summary: "O build ficou preso aguardando download/upload ou chamada externa.",
    likelyCause: "Rede instável, storage lento, npm/Maven indisponível ou upload interrompido.",
    action: "Tentar novamente; se persistir, reduzir tamanho do artefato ou assets.",
    severity: "warning",
  },
  memory_overflow: {
    cause: "memory_overflow",
    title: "Estouro de memória",
    summary: "O worker apresentou sinais de falta de memória durante a compilação.",
    likelyCause: "Bundle grande, Gradle heap insuficiente ou assets pesados.",
    action: "Otimizar assets e reprocessar em ambiente limpo.",
    severity: "critical",
  },
  bundletool_crash: {
    cause: "bundletool_crash",
    title: "Bundletool falhou",
    summary: "A conversão/validação AAB→APK travou ou encerrou no bundletool.",
    likelyCause: "AAB inválido, bundletool interrompido ou recurso Android corrompido.",
    action: "Validar o AAB original e reprocessar com logs completos.",
    severity: "critical",
  },
  unknown_stall: {
    cause: "unknown_stall",
    title: "Build sem progresso detectado",
    summary: "O watchdog encerrou um job que ficou tempo demais sem status final.",
    likelyCause: "Erro silencioso, worker sem resposta ou etapa externa sem retorno.",
    action: "Abrir logs e reprocessar. Se repetir, investigar o estágio final registrado.",
    severity: "warning",
  },
};

export function recoverBuild(input: BuildRecoveryInput): BuildRecoveryDiagnosis {
  const text = [input.stage, input.stdout, input.stderr, input.lastLog, input.errorMessage]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  if (/outofmemory|heap out of memory|java heap|sigkill|killed/.test(text)) return catalog.memory_overflow;
  if (/bundletool|build-apks|universal\.apk|invalid app bundle/.test(text)) return catalog.bundletool_crash;
  if (/sign|apksigner|jarsigner|keystore|assin/.test(text)) return catalog.signing_stuck;
  if (/gradle|assemble|bundleRelease|:app:/.test(text) || input.stage === "running_gradle") return catalog.gradle_freeze;
  if (/dependency|depend[eê]ncia|module not found|cannot find module|duplicate class|conflict/.test(text)) return catalog.dependency_conflict;
  if (/network|fetch failed|etimedout|econnreset|upload|download|storage/.test(text)) return catalog.network_timeout;
  if (/worker|disconnect|runtime|process.*exit|sem resposta/.test(text)) return catalog.worker_disconnected;

  return catalog.unknown_stall;
}

export function recoveryToLogLine(diagnosis: BuildRecoveryDiagnosis): string {
  return `[WATCHDOG] ${diagnosis.title}: ${diagnosis.likelyCause} Ação recomendada: ${diagnosis.action}`;
}