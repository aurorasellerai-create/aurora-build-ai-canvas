// Security Score Engine — Aurora Build AI
// Calcula score 0-100 a partir de sinais de manifesto, permissões, dependências e Play Store.

export type SecurityCategory = "manifest" | "permissions" | "dependencies" | "playStore" | "signing";
export type SecurityBadge = "secure" | "attention" | "critical";

export interface SecurityCategoryScore {
  key: SecurityCategory;
  label: string;
  score: number;
  weight: number;
  reasons: string[];
}

export interface SecurityScoreResult {
  total: number;
  badge: SecurityBadge;
  color: string;
  glow: string;
  categories: SecurityCategoryScore[];
  computedAt: string;
}

export interface SecuritySignals {
  dangerousPermissions?: string[];
  totalPermissions?: number;
  hasSignature?: boolean;
  signatureScheme?: "v1" | "v2" | "v3" | "v4" | "none";
  cleartextTraffic?: boolean;
  targetSdk?: number;
  isDebugBuild?: boolean;
  allowBackup?: boolean;
  vulnerableDependencies?: number;
  totalDependencies?: number;
  exposedSecrets?: number;
  insecureApis?: string[];
  requestInstallPackages?: boolean;
  foregroundServiceIssues?: boolean;
  scopedStorageOk?: boolean;
}

const DANGEROUS_PERMISSIONS = new Set([
  "android.permission.READ_SMS",
  "android.permission.SEND_SMS",
  "android.permission.READ_CONTACTS",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.RECORD_AUDIO",
  "android.permission.CAMERA",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.REQUEST_INSTALL_PACKAGES",
  "android.permission.SYSTEM_ALERT_WINDOW",
]);

function scoreManifest(s: SecuritySignals): SecurityCategoryScore {
  let score = 100;
  const reasons: string[] = [];
  if (s.cleartextTraffic) { score -= 25; reasons.push("Tráfego HTTP em texto puro habilitado"); }
  if (s.isDebugBuild) { score -= 30; reasons.push("Build em modo debug detectado"); }
  if (s.allowBackup) { score -= 10; reasons.push("allowBackup=true expõe dados do app"); }
  if (typeof s.targetSdk === "number" && s.targetSdk < 33) {
    score -= 15; reasons.push(`targetSdk ${s.targetSdk} abaixo do mínimo da Play Store`);
  }
  return { key: "manifest", label: "Manifesto", score: Math.max(0, score), weight: 0.25, reasons };
}

function scorePermissions(s: SecuritySignals): SecurityCategoryScore {
  let score = 100;
  const reasons: string[] = [];
  const dangerous = (s.dangerousPermissions ?? []).filter((p) => DANGEROUS_PERMISSIONS.has(p));
  if (dangerous.length > 0) {
    score -= Math.min(50, dangerous.length * 8);
    reasons.push(`${dangerous.length} permissão(ões) sensível(is) detectada(s)`);
  }
  if (s.requestInstallPackages) {
    score -= 15;
    reasons.push("REQUEST_INSTALL_PACKAGES requer justificativa Play Store");
  }
  if ((s.totalPermissions ?? 0) > 25) {
    score -= 5;
    reasons.push("Volume alto de permissões — revise necessidade");
  }
  return { key: "permissions", label: "Permissões", score: Math.max(0, score), weight: 0.25, reasons };
}

function scoreDependencies(s: SecuritySignals): SecurityCategoryScore {
  let score = 100;
  const reasons: string[] = [];
  const vulns = s.vulnerableDependencies ?? 0;
  if (vulns > 0) {
    score -= Math.min(60, vulns * 12);
    reasons.push(`${vulns} dependência(s) com vulnerabilidades conhecidas`);
  }
  if ((s.exposedSecrets ?? 0) > 0) {
    score -= 25;
    reasons.push(`${s.exposedSecrets} segredo(s) potencialmente expostos`);
  }
  if ((s.insecureApis?.length ?? 0) > 0) {
    score -= 10;
    reasons.push(`APIs inseguras: ${s.insecureApis!.join(", ")}`);
  }
  return { key: "dependencies", label: "Dependências", score: Math.max(0, score), weight: 0.2, reasons };
}

function scoreSigning(s: SecuritySignals): SecurityCategoryScore {
  let score = 100;
  const reasons: string[] = [];
  if (!s.hasSignature || s.signatureScheme === "none") {
    score = 0;
    reasons.push("APK/AAB sem assinatura válida");
  } else if (s.signatureScheme === "v1") {
    score -= 40;
    reasons.push("Assinatura v1 obsoleta — adicione v2/v3");
  }
  return { key: "signing", label: "Assinatura", score: Math.max(0, score), weight: 0.1, reasons };
}

function scorePlayStore(s: SecuritySignals): SecurityCategoryScore {
  let score = 100;
  const reasons: string[] = [];
  if (typeof s.targetSdk === "number" && s.targetSdk < 34) {
    score -= 20;
    reasons.push("targetSdk abaixo do exigido pela Play Console");
  }
  if (s.isDebugBuild) { score -= 40; reasons.push("Builds debug são rejeitados na Play Console"); }
  if (s.foregroundServiceIssues) { score -= 15; reasons.push("Foreground service sem justificativa"); }
  if (s.scopedStorageOk === false) { score -= 15; reasons.push("Storage fora do padrão Scoped Storage"); }
  return { key: "playStore", label: "Play Store", score: Math.max(0, score), weight: 0.2, reasons };
}

export function calculateSecurityScore(signals: SecuritySignals): SecurityScoreResult {
  const categories = [
    scoreManifest(signals),
    scorePermissions(signals),
    scoreDependencies(signals),
    scoreSigning(signals),
    scorePlayStore(signals),
  ];
  const total = Math.round(
    categories.reduce((acc, c) => acc + c.score * c.weight, 0)
  );
  return {
    total,
    ...badgeFor(total),
    categories,
    computedAt: new Date().toISOString(),
  };
}

export function badgeFor(score: number): { badge: SecurityBadge; color: string; glow: string } {
  if (score >= 85) return { badge: "secure", color: "hsl(150 90% 55%)", glow: "0 0 24px hsl(150 90% 55% / 0.55)" };
  if (score >= 60) return { badge: "attention", color: "hsl(45 100% 60%)", glow: "0 0 24px hsl(45 100% 60% / 0.55)" };
  return { badge: "critical", color: "hsl(0 90% 60%)", glow: "0 0 28px hsl(0 90% 60% / 0.6)" };
}

export const badgeLabel: Record<SecurityBadge, string> = {
  secure: "Seguro",
  attention: "Atenção",
  critical: "Crítico",
};
