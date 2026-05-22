/**
 * Aurora Validator AI — Engine de explicação inteligente.
 * Transforma uma permissão / item de manifesto / scan em uma explicação humana,
 * com severidade, impacto, risco Play Store e recomendação acionável.
 */

import {
  findPermissionKnowledge,
  type AiSeverity,
  type PermissionKnowledgeEntry,
} from "@/lib/permissionsKnowledgeBase";

export type AiExplanationInput = {
  key: string;
  /** Severidade observada pelo Validator (warn/danger/ok) */
  detectedSeverity?: "ok" | "warn" | "danger";
  /** Descrição original já existente — usada como fallback */
  fallbackDescription?: string;
  /** Origem para personalizar o badge (Permissão, Manifest, Scan) */
  source?: "Permissão" | "Manifest" | "Scan";
};

export type AiExplanation = {
  key: string;
  source: "Permissão" | "Manifest" | "Scan";
  title: string;
  severity: AiSeverity;
  explanation: string;
  impact: string;
  playStoreRisk: string;
  securityRisk: string;
  recommendation: string;
  docs: string;
  playStorePolicy?: string;
  /** Marca se a explicação veio da base curada ou foi gerada heuristicamente */
  generated: "knowledge-base" | "heuristic";
};

const SEVERITY_FROM_DETECTED: Record<NonNullable<AiExplanationInput["detectedSeverity"]>, AiSeverity> = {
  ok: "safe",
  warn: "warning",
  danger: "critical",
};

const SEVERITY_LABEL: Record<AiSeverity, string> = {
  critical: "Crítico",
  warning: "Atenção",
  safe: "Seguro",
};

/** Gera explicação heurística quando a permissão não está catalogada. */
function buildHeuristicExplanation(input: AiExplanationInput): AiExplanation {
  const sev: AiSeverity = input.detectedSeverity
    ? SEVERITY_FROM_DETECTED[input.detectedSeverity]
    : "warning";

  const niceName = input.key.replace(/^android\.permission\./i, "").replace(/[_:]/g, " ");

  const titleByLevel: Record<AiSeverity, string> = {
    critical: `Risco crítico detectado em ${niceName}`,
    warning: `Atenção necessária em ${niceName}`,
    safe: `${niceName} dentro do esperado`,
  };

  const explanationByLevel: Record<AiSeverity, string> = {
    critical:
      `O item "${niceName}" foi sinalizado como crítico pelo Aurora Validator. Sem correção, há grande chance de rejeição na Play Store ou exposição de dados do usuário.`,
    warning:
      `O item "${niceName}" requer revisão. Pode passar pela Play Store, mas representa risco de auditoria ou de comportamento inesperado em alguns dispositivos.`,
    safe:
      `O item "${niceName}" está configurado dentro do esperado para apps modernos. Nenhuma ação imediata é necessária.`,
  };

  return {
    key: input.key,
    source: input.source ?? "Permissão",
    title: titleByLevel[sev],
    severity: sev,
    explanation: input.fallbackDescription ?? explanationByLevel[sev],
    impact: "Pode afetar publicação, comportamento em runtime ou privacidade do usuário.",
    playStoreRisk:
      sev === "critical"
        ? "Alta probabilidade de rejeição ou remoção até que o item seja corrigido."
        : sev === "warning"
        ? "Possíveis avisos no Play Console e perguntas durante a revisão."
        : "Sem risco direto identificado.",
    securityRisk:
      sev === "critical"
        ? "Vetor de ataque relevante caso explorado por agentes maliciosos."
        : sev === "warning"
        ? "Risco moderado de exposição de dados se mal implementado."
        : "Risco baixo.",
    recommendation:
      sev === "safe"
        ? "Mantenha o monitoramento e revise em cada nova publicação."
        : "Revise no AndroidManifest.xml, justifique no formulário da Play Store ou remova se não for essencial.",
    docs: "https://developer.android.com/guide/topics/permissions/overview",
    generated: "heuristic",
  };
}

/** Combina a base de conhecimento com a severidade detectada pelo Validator. */
function fromKnowledge(entry: PermissionKnowledgeEntry, input: AiExplanationInput): AiExplanation {
  // Se o Validator marcou o item como OK (auto-fix aplicado), reportamos como seguro.
  const severity: AiSeverity =
    input.detectedSeverity === "ok" ? "safe" : entry.severity;

  return {
    key: entry.key,
    source: input.source ?? "Permissão",
    title: severity === "safe" ? `${entry.title} — resolvido` : entry.title,
    severity,
    explanation: entry.explanation,
    impact: entry.impact,
    playStoreRisk: entry.playStoreRisk,
    securityRisk: entry.securityRisk,
    recommendation:
      severity === "safe"
        ? "Item já está em conformidade. Mantenha o monitoramento em novas publicações."
        : entry.recommendation,
    docs: entry.docs,
    playStorePolicy: entry.playStorePolicy,
    generated: "knowledge-base",
  };
}

/**
 * Gera explicação inteligente para um item detectado pelo Validator.
 */
export function generateAiExplanation(input: AiExplanationInput): AiExplanation {
  const entry = findPermissionKnowledge(input.key);
  if (entry) return fromKnowledge(entry, input);
  return buildHeuristicExplanation(input);
}

export function generateBatchAiExplanations(inputs: AiExplanationInput[]): AiExplanation[] {
  return inputs.map(generateAiExplanation);
}

export const severityLabel = (s: AiSeverity) => SEVERITY_LABEL[s];
