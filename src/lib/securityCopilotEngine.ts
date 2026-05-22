// Security Copilot Engine — gera respostas contextuais para perguntas de segurança.
// Usa heurísticas locais; pode delegar à edge de IA quando disponível.

export interface CopilotContext {
  permission?: string;
  finding?: string;
  score?: number;
  targetSdk?: number;
}

export interface CopilotAnswer {
  question: string;
  answer: string;
  citations: { label: string; url: string }[];
  severity: "info" | "warn" | "danger";
}

const KB: Record<string, { description: string; risk: string; fix: string; url: string }> = {
  "android.permission.READ_SMS": {
    description: "Permite ler mensagens SMS recebidas e armazenadas.",
    risk: "Alto risco de exposição de códigos 2FA e dados pessoais. Play Store restringe seu uso.",
    fix: "Substitua por SMS Retriever API para autenticação ou remova a permissão.",
    url: "https://support.google.com/googleplay/android-developer/answer/9047303",
  },
  "android.permission.REQUEST_INSTALL_PACKAGES": {
    description: "Permite instalar outros APKs no dispositivo.",
    risk: "Categoria sensível — exige Declaration Form e justificativa funcional.",
    fix: "Use Play Core in-app updates ou remova a permissão.",
    url: "https://support.google.com/googleplay/android-developer/answer/12085295",
  },
  "android.permission.WRITE_EXTERNAL_STORAGE": {
    description: "Escrita arbitrária no armazenamento externo (legado).",
    risk: "Bloqueada pelo Scoped Storage em targetSdk 30+.",
    fix: "Migre para MediaStore ou Storage Access Framework.",
    url: "https://developer.android.com/training/data-storage",
  },
  "android.permission.ACCESS_FINE_LOCATION": {
    description: "Acesso à localização exata por GPS.",
    risk: "Política de Localização exige uso em primeiro plano declarado.",
    fix: "Solicite em runtime e justifique no Data Safety form.",
    url: "https://support.google.com/googleplay/android-developer/answer/9799150",
  },
};

export async function askSecurityCopilot(question: string, ctx: CopilotContext = {}): Promise<CopilotAnswer> {
  const q = question.toLowerCase().trim();
  const perm = ctx.permission ?? Object.keys(KB).find((p) => q.includes(p.split(".").pop()!.toLowerCase()));

  if (perm && KB[perm]) {
    const k = KB[perm];
    return {
      question,
      answer: `**${perm}**\n\n${k.description}\n\n**Por que é arriscada:** ${k.risk}\n\n**Como corrigir:** ${k.fix}`,
      citations: [{ label: "Política oficial Google Play", url: k.url }],
      severity: "danger",
    };
  }

  if (q.includes("play store") || q.includes("reprova")) {
    return {
      question,
      answer: "A Play Store reprova builds com targetSdk antigo, assinatura inválida, debug keystore, cleartext traffic ou permissões sem justificativa. Use o Compliance Engine acima para um relatório detalhado.",
      citations: [{ label: "Requisitos da Play Console", url: "https://support.google.com/googleplay/android-developer/answer/9859348" }],
      severity: "warn",
    };
  }

  if (q.includes("score") || q.includes("nota")) {
    return {
      question,
      answer: `Seu score atual é **${ctx.score ?? "—"}/100**. O cálculo pondera manifesto (25%), permissões (25%), dependências (20%), Play Store (20%) e assinatura (10%).`,
      citations: [],
      severity: "info",
    };
  }

  if (q.includes("corrigir") || q.includes("fix")) {
    return {
      question,
      answer: "Você pode aplicar correções automáticas no painel Auto Fix: remover debug keystore, desabilitar cleartextTraffic, definir allowBackup=false, atualizar targetSdk e migrar para assinatura v2/v3.",
      citations: [{ label: "Hardening Android", url: "https://developer.android.com/topic/security/best-practices" }],
      severity: "info",
    };
  }

  return {
    question,
    answer: "Posso explicar permissões Android, riscos de manifesto, políticas Play Store e sugerir correções. Tente perguntar sobre uma permissão específica ou sobre seu Security Score.",
    citations: [],
    severity: "info",
  };
}
