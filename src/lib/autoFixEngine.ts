// Auto Fix Engine — gera diffs sugeridos para problemas comuns de segurança Android.

export type AutoFixId =
  | "debug-keystore"
  | "cleartext-traffic"
  | "allow-backup"
  | "target-sdk"
  | "v1-signing"
  | "write-external-storage"
  | "request-install-packages";

export interface AutoFix {
  id: AutoFixId;
  title: string;
  description: string;
  impact: string;
  severity: "low" | "medium" | "high";
  before: string;
  after: string;
  reversible: boolean;
}

export const AUTO_FIXES: Record<AutoFixId, AutoFix> = {
  "debug-keystore": {
    id: "debug-keystore",
    title: "Remover keystore de debug",
    description: "Substitui a keystore de debug por uma de release segura.",
    impact: "Build deixa de ser rejeitado pela Play Console.",
    severity: "high",
    before: `signingConfigs {\n  release { storeFile file('debug.keystore') }\n}`,
    after: `signingConfigs {\n  release {\n    storeFile file(System.getenv('AURORA_KEYSTORE'))\n    storePassword System.getenv('AURORA_KS_PASS')\n    keyAlias 'aurora'\n    keyPassword System.getenv('AURORA_KEY_PASS')\n  }\n}`,
    reversible: true,
  },
  "cleartext-traffic": {
    id: "cleartext-traffic",
    title: "Desabilitar cleartext traffic",
    description: "Força HTTPS em todas as conexões.",
    impact: "Elimina vetores MITM e atende política Google Play.",
    severity: "high",
    before: `<application\n  android:usesCleartextTraffic="true">`,
    after: `<application\n  android:usesCleartextTraffic="false"\n  android:networkSecurityConfig="@xml/network_security_config">`,
    reversible: true,
  },
  "allow-backup": {
    id: "allow-backup",
    title: "Desabilitar allowBackup",
    description: "Evita backup automático que pode expor dados sensíveis.",
    impact: "Reduz superfície de extração de dados via adb backup.",
    severity: "medium",
    before: `<application android:allowBackup="true">`,
    after: `<application android:allowBackup="false" android:fullBackupContent="false">`,
    reversible: true,
  },
  "target-sdk": {
    id: "target-sdk",
    title: "Atualizar targetSdk para 34",
    description: "Atualiza targetSdkVersion para o mínimo aceito pela Play Console.",
    impact: "Mantém o app elegível para novas publicações e updates.",
    severity: "high",
    before: `defaultConfig {\n  targetSdkVersion 30\n}`,
    after: `defaultConfig {\n  targetSdkVersion 34\n}`,
    reversible: true,
  },
  "v1-signing": {
    id: "v1-signing",
    title: "Adicionar assinatura v2/v3",
    description: "Habilita esquemas modernos de assinatura.",
    impact: "Compatibiliza com Play App Signing e Android 11+.",
    severity: "medium",
    before: `signingConfigs.release {\n  v1SigningEnabled true\n  v2SigningEnabled false\n}`,
    after: `signingConfigs.release {\n  v1SigningEnabled true\n  v2SigningEnabled true\n  v3SigningEnabled true\n}`,
    reversible: true,
  },
  "write-external-storage": {
    id: "write-external-storage",
    title: "Remover WRITE_EXTERNAL_STORAGE",
    description: "Substitui pela API Scoped Storage / MediaStore.",
    impact: "Conformidade com política de armazenamento da Play Store.",
    severity: "medium",
    before: `<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />`,
    after: `<!-- removido: use MediaStore / Storage Access Framework -->`,
    reversible: true,
  },
  "request-install-packages": {
    id: "request-install-packages",
    title: "Remover REQUEST_INSTALL_PACKAGES",
    description: "Permissão sensível que requer Declaration Form.",
    impact: "Evita reprovação na revisão da Play Console.",
    severity: "high",
    before: `<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />`,
    after: `<!-- removido: use Play Core in-app updates -->`,
    reversible: true,
  },
};

export interface AppliedFix {
  id: AutoFixId;
  appliedAt: string;
  rolledBack?: boolean;
}

const KEY = "aurora:security:applied-fixes";

export function listAppliedFixes(): AppliedFix[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function persist(list: AppliedFix[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function applyFix(id: AutoFixId): AppliedFix {
  const applied: AppliedFix = { id, appliedAt: new Date().toISOString() };
  const list = listAppliedFixes().filter((f) => f.id !== id);
  list.unshift(applied);
  persist(list);
  return applied;
}

export function rollbackFix(id: AutoFixId) {
  const list = listAppliedFixes().map((f) => (f.id === id ? { ...f, rolledBack: true } : f));
  persist(list);
}
