// Play Store Compliance Engine
import type { SecuritySignals } from "./securityScore";

export interface ComplianceIssue {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "blocker";
  detail: string;
  policyUrl: string;
  suggestion: string;
}

export interface ComplianceReport {
  score: number;
  status: "ready" | "review" | "blocked";
  issues: ComplianceIssue[];
  passed: string[];
  computedAt: string;
}

const POLICY = {
  targetSdk: "https://developer.android.com/google/play/requirements/target-sdk",
  cleartext: "https://developer.android.com/privacy-and-security/risks/cleartext-communications",
  debug: "https://support.google.com/googleplay/android-developer/answer/9859348",
  permissions: "https://support.google.com/googleplay/android-developer/answer/9888170",
  signature: "https://developer.android.com/studio/publish/app-signing",
  foreground: "https://developer.android.com/about/versions/14/changes/fgs-types-required",
  storage: "https://developer.android.com/training/data-storage",
  install: "https://support.google.com/googleplay/android-developer/answer/12085295",
};

export function evaluatePlayStoreCompliance(s: SecuritySignals): ComplianceReport {
  const issues: ComplianceIssue[] = [];
  const passed: string[] = [];

  if (typeof s.targetSdk === "number" && s.targetSdk < 34) {
    issues.push({
      id: "target-sdk",
      title: `targetSdk ${s.targetSdk} abaixo do mínimo (34)`,
      severity: "blocker",
      detail: "A Play Console rejeita publicações com targetSdk antigo.",
      policyUrl: POLICY.targetSdk,
      suggestion: "Atualize o targetSdkVersion para 34 no build.gradle.",
    });
  } else passed.push("targetSdk dentro do exigido");

  if (s.cleartextTraffic) {
    issues.push({
      id: "cleartext",
      title: "Tráfego HTTP em texto puro habilitado",
      severity: "high",
      detail: "android:usesCleartextTraffic=true permite interceptação MITM.",
      policyUrl: POLICY.cleartext,
      suggestion: "Defina cleartextTraffic=false e force HTTPS em todas as requisições.",
    });
  } else passed.push("Comunicação criptografada (HTTPS)");

  if (s.isDebugBuild) {
    issues.push({
      id: "debug-build",
      title: "Build em modo debug",
      severity: "blocker",
      detail: "APKs assinados com debug keystore são rejeitados pela Play Console.",
      policyUrl: POLICY.debug,
      suggestion: "Gere build de release com keystore própria.",
    });
  } else passed.push("Build de release detectado");

  if (!s.hasSignature || s.signatureScheme === "none") {
    issues.push({
      id: "no-signature",
      title: "App sem assinatura válida",
      severity: "blocker",
      detail: "Play Console exige assinatura v2 ou superior.",
      policyUrl: POLICY.signature,
      suggestion: "Configure assinatura v2/v3 antes do upload.",
    });
  } else if (s.signatureScheme === "v1") {
    issues.push({
      id: "v1-only",
      title: "Apenas assinatura v1",
      severity: "high",
      detail: "Assinatura v1 não é mais aceita para novos uploads.",
      policyUrl: POLICY.signature,
      suggestion: "Adicione esquema v2/v3 ao APK Signing Config.",
    });
  } else passed.push(`Assinatura ${s.signatureScheme} válida`);

  if (s.requestInstallPackages) {
    issues.push({
      id: "request-install",
      title: "REQUEST_INSTALL_PACKAGES declarado",
      severity: "high",
      detail: "Permissão requer justificativa específica e Declaration Form.",
      policyUrl: POLICY.install,
      suggestion: "Remova a permissão ou envie o formulário de Device & Network Abuse.",
    });
  }

  if (s.foregroundServiceIssues) {
    issues.push({
      id: "fgs",
      title: "Foreground service sem tipo declarado",
      severity: "medium",
      detail: "Android 14+ exige foregroundServiceType no manifesto.",
      policyUrl: POLICY.foreground,
      suggestion: "Declare o tipo correto (mediaPlayback, location, dataSync...).",
    });
  }

  if (s.scopedStorageOk === false) {
    issues.push({
      id: "scoped-storage",
      title: "Acesso fora do Scoped Storage",
      severity: "medium",
      detail: "WRITE_EXTERNAL_STORAGE / MANAGE_EXTERNAL_STORAGE têm uso restrito.",
      policyUrl: POLICY.storage,
      suggestion: "Migre para MediaStore / SAF (Storage Access Framework).",
    });
  }

  const weight = { low: 4, medium: 10, high: 18, blocker: 35 } as const;
  const penalty = issues.reduce((acc, i) => acc + weight[i.severity], 0);
  const score = Math.max(0, 100 - penalty);
  const status: ComplianceReport["status"] = issues.some((i) => i.severity === "blocker")
    ? "blocked"
    : score >= 85 ? "ready" : "review";

  return { score, status, issues, passed, computedAt: new Date().toISOString() };
}

export const complianceStatusLabel: Record<ComplianceReport["status"], string> = {
  ready: "Pronto para publicação",
  review: "Requer revisão",
  blocked: "Bloqueado pela Play Store",
};
