// ─────────────────────────────────────────────────────────────────────────────
// findingsEngine.ts — Interpret AXML manifest + AAB contents into real findings.
// Pure functions. No side effects. All heuristics documented inline.
// ─────────────────────────────────────────────────────────────────────────────

import type { AxmlElement } from "./axml.ts";
import { walk, attr } from "./axml.ts";

export type Severity = "critical" | "warning" | "info" | "safe";

export type Finding = {
  key: string;                       // canonical id, e.g. android.permission.REQUEST_INSTALL_PACKAGES
  category: "permission" | "manifest" | "security" | "network" | "signature" | "sdk" | "policy" | "performance";
  title: string;                     // short human title
  severity: Severity;
  location: {                        // where in the AAB it was found
    file: string;
    element?: string;                // e.g. <activity android:name="...">
    attribute?: string;              // e.g. android:exported
  };
  evidence: string;                  // exact fragment that triggered the finding
  androidRule?: string;              // e.g. "Android 13+ runtime permission"
  playStorePolicy?: string;          // e.g. "Broad Package (All Files) Access"
  docs: string;                      // official doc URL
  policyUrl?: string;                // Play Store policy URL
};

export type ManifestSummary = {
  package: string | null;
  versionName: string | null;
  versionCode: number | null;
  minSdk: number | null;
  targetSdk: number | null;
  compileSdk: number | null;
  usesCleartextTraffic: boolean | null;
  allowBackup: boolean | null;
  networkSecurityConfig: string | null;
  activitiesCount: number;
  servicesCount: number;
  receiversCount: number;
  providersCount: number;
};

export type ExtractedManifest = {
  summary: ManifestSummary;
  permissions: Array<{ name: string; maxSdk?: number; required?: boolean }>;
  deepLinks: Array<{ host: string | null; scheme: string | null; pathPrefix?: string | null; autoVerify: boolean; activity: string }>;
  components: {
    activities: Array<{ name: string; exported: boolean | null; intentFilters: number }>;
    services: Array<{ name: string; exported: boolean | null; foregroundServiceType: string | null }>;
    receivers: Array<{ name: string; exported: boolean | null }>;
    providers: Array<{ name: string; exported: boolean | null; authorities: string | null }>;
  };
};

// Curated Android/Play Store links per permission — extend as needed.
const PERMISSION_META: Record<string, { severity: Severity; playStorePolicy?: string; policyUrl?: string; docs: string; androidRule?: string; title?: string }> = {
  "android.permission.REQUEST_INSTALL_PACKAGES": {
    severity: "critical",
    title: "Instalação de pacotes externos (REQUEST_INSTALL_PACKAGES)",
    docs: "https://developer.android.com/reference/android/Manifest.permission#REQUEST_INSTALL_PACKAGES",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/12085295",
    playStorePolicy: "Device and Network Abuse — Install Packages",
    androidRule: "API 26+: permissão restrita, exige justificativa na Play Console",
  },
  "android.permission.MANAGE_EXTERNAL_STORAGE": {
    severity: "critical",
    title: "Acesso amplo ao armazenamento (MANAGE_EXTERNAL_STORAGE)",
    docs: "https://developer.android.com/training/data-storage/manage-all-files",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10467955",
    playStorePolicy: "All Files Access",
    androidRule: "Scoped Storage (Android 11+): uso restrito a apps essenciais",
  },
  "android.permission.SYSTEM_ALERT_WINDOW": {
    severity: "warning",
    title: "Sobrepor janelas (SYSTEM_ALERT_WINDOW)",
    docs: "https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW",
    playStorePolicy: "Disruptive Ads / Overlays",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/9857753",
  },
  "android.permission.ACCESS_BACKGROUND_LOCATION": {
    severity: "critical",
    title: "Localização em background",
    docs: "https://developer.android.com/training/location/background",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/9799150",
    playStorePolicy: "Location Permissions",
    androidRule: "Android 10+: requer permissão separada e justificativa",
  },
  "android.permission.READ_SMS": { severity: "critical", title: "Leitura de SMS", docs: "https://developer.android.com/reference/android/Manifest.permission#READ_SMS", policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820", playStorePolicy: "SMS and Call Log Permissions" },
  "android.permission.SEND_SMS": { severity: "critical", title: "Envio de SMS", docs: "https://developer.android.com/reference/android/Manifest.permission#SEND_SMS", policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820", playStorePolicy: "SMS and Call Log Permissions" },
  "android.permission.READ_CALL_LOG": { severity: "critical", title: "Leitura do histórico de chamadas", docs: "https://developer.android.com/reference/android/Manifest.permission#READ_CALL_LOG", policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820", playStorePolicy: "SMS and Call Log Permissions" },
  "android.permission.CAMERA": { severity: "warning", title: "Câmera", docs: "https://developer.android.com/reference/android/Manifest.permission#CAMERA", androidRule: "Runtime permission" },
  "android.permission.RECORD_AUDIO": { severity: "warning", title: "Gravação de áudio", docs: "https://developer.android.com/reference/android/Manifest.permission#RECORD_AUDIO", androidRule: "Runtime permission" },
  "android.permission.ACCESS_FINE_LOCATION": { severity: "warning", title: "Localização precisa", docs: "https://developer.android.com/training/location/permissions" },
  "android.permission.ACCESS_COARSE_LOCATION": { severity: "info", title: "Localização aproximada", docs: "https://developer.android.com/training/location/permissions" },
  "android.permission.READ_EXTERNAL_STORAGE": { severity: "info", title: "Leitura de armazenamento externo (legado)", docs: "https://developer.android.com/training/data-storage" },
  "android.permission.WRITE_EXTERNAL_STORAGE": { severity: "warning", title: "Escrita em armazenamento externo (legado)", docs: "https://developer.android.com/training/data-storage" },
  "android.permission.READ_MEDIA_IMAGES": { severity: "info", title: "Acesso a imagens (Android 13+)", docs: "https://developer.android.com/about/versions/13/behavior-changes-13#granular-media-permissions", androidRule: "Android 13+: substitui READ_EXTERNAL_STORAGE" },
  "android.permission.READ_MEDIA_VIDEO": { severity: "info", title: "Acesso a vídeos (Android 13+)", docs: "https://developer.android.com/about/versions/13/behavior-changes-13#granular-media-permissions" },
  "android.permission.READ_MEDIA_AUDIO": { severity: "info", title: "Acesso a áudio (Android 13+)", docs: "https://developer.android.com/about/versions/13/behavior-changes-13#granular-media-permissions" },
  "android.permission.POST_NOTIFICATIONS": { severity: "info", title: "Notificações (Android 13+)", docs: "https://developer.android.com/develop/ui/views/notifications/notification-permission", androidRule: "Android 13+: runtime permission obrigatória" },
  "android.permission.BIND_ACCESSIBILITY_SERVICE": { severity: "critical", title: "Serviço de Acessibilidade", docs: "https://developer.android.com/guide/topics/ui/accessibility/service", policyUrl: "https://support.google.com/googleplay/android-developer/answer/10964491", playStorePolicy: "Accessibility API" },
  "android.permission.QUERY_ALL_PACKAGES": { severity: "warning", title: "Consulta de todos os pacotes instalados", docs: "https://developer.android.com/training/package-visibility", policyUrl: "https://support.google.com/googleplay/android-developer/answer/10158779", playStorePolicy: "Package (App) Visibility" },
  "android.permission.FOREGROUND_SERVICE": { severity: "info", title: "Serviço em primeiro plano", docs: "https://developer.android.com/guide/components/foreground-services" },
  "android.permission.INTERNET": { severity: "safe", title: "Acesso à internet", docs: "https://developer.android.com/reference/android/Manifest.permission#INTERNET" },
  "android.permission.ACCESS_NETWORK_STATE": { severity: "safe", title: "Estado da rede", docs: "https://developer.android.com/reference/android/Manifest.permission#ACCESS_NETWORK_STATE" },
  "android.permission.WAKE_LOCK": { severity: "safe", title: "Wake lock", docs: "https://developer.android.com/reference/android/Manifest.permission#WAKE_LOCK" },
  "android.permission.VIBRATE": { severity: "safe", title: "Vibração", docs: "https://developer.android.com/reference/android/Manifest.permission#VIBRATE" },
  "android.permission.BILLING": { severity: "info", title: "Google Play Billing", docs: "https://developer.android.com/google/play/billing" },
  "com.android.vending.BILLING": { severity: "info", title: "Google Play Billing", docs: "https://developer.android.com/google/play/billing" },
};

function fallbackPermissionMeta(name: string): { severity: Severity; docs: string; title: string } {
  const short = name.replace(/^android\.permission\./, "");
  // Common heuristic: dangerous keywords
  const dangerous = /(SMS|CALL|CONTACT|CAMERA|MICROPHONE|LOCATION|CALENDAR|BODY_SENSORS|HEALTH|READ_PHONE_STATE|BLUETOOTH_CONNECT|BLUETOOTH_SCAN|NEARBY_WIFI|BIND_)/i;
  const restricted = /(MANAGE_|WRITE_SETTINGS|SYSTEM_ALERT|INSTALL_PACKAGES|USE_FULL_SCREEN_INTENT|SCHEDULE_EXACT_ALARM)/i;
  const sev: Severity = restricted.test(name) ? "critical" : dangerous.test(name) ? "warning" : "info";
  return {
    severity: sev,
    docs: "https://developer.android.com/reference/android/Manifest.permission",
    title: `Permissão ${short.replace(/_/g, " ").toLowerCase()}`,
  };
}

export function extractManifest(root: AxmlElement | null): ExtractedManifest {
  const empty: ExtractedManifest = {
    summary: {
      package: null, versionName: null, versionCode: null,
      minSdk: null, targetSdk: null, compileSdk: null,
      usesCleartextTraffic: null, allowBackup: null, networkSecurityConfig: null,
      activitiesCount: 0, servicesCount: 0, receiversCount: 0, providersCount: 0,
    },
    permissions: [],
    deepLinks: [],
    components: { activities: [], services: [], receivers: [], providers: [] },
  };
  if (!root) return empty;

  const result = empty;
  result.summary.package = String(attr(root, "package") ?? "") || null;
  const vc = attr(root, "versionCode"); result.summary.versionCode = typeof vc === "number" ? vc : (vc ? Number(vc) : null);
  result.summary.versionName = (attr(root, "versionName") as string | null) ?? null;
  result.summary.compileSdk = Number(attr(root, "compileSdkVersion") ?? attr(root, "platformBuildVersionCode") ?? NaN) || null;

  walk(root, (el, parents) => {
    const parentName = parents[parents.length - 1]?.name;
    switch (el.name) {
      case "uses-sdk": {
        const min = Number(attr(el, "minSdkVersion")); if (!Number.isNaN(min)) result.summary.minSdk = min;
        const tgt = Number(attr(el, "targetSdkVersion")); if (!Number.isNaN(tgt)) result.summary.targetSdk = tgt;
        break;
      }
      case "uses-permission":
      case "uses-permission-sdk-23": {
        const name = attr(el, "name") as string;
        if (name) result.permissions.push({
          name,
          maxSdk: Number(attr(el, "maxSdkVersion")) || undefined,
          required: (attr(el, "required") ?? true) !== false,
        });
        break;
      }
      case "application": {
        result.summary.usesCleartextTraffic = (attr(el, "usesCleartextTraffic") as boolean | null) ?? null;
        result.summary.allowBackup = (attr(el, "allowBackup") as boolean | null) ?? null;
        result.summary.networkSecurityConfig = (attr(el, "networkSecurityConfig") as string | null) ?? null;
        break;
      }
      case "activity":
      case "activity-alias": {
        const name = String(attr(el, "name") ?? "");
        const exported = attr(el, "exported") as boolean | null;
        const filters = el.children.filter((c) => c.name === "intent-filter");
        result.components.activities.push({ name, exported, intentFilters: filters.length });
        result.summary.activitiesCount++;
        // Deep links
        for (const f of filters) {
          const autoVerify = (attr(f, "autoVerify") as boolean | null) ?? false;
          const data = f.children.filter((c) => c.name === "data");
          for (const d of data) {
            const scheme = (attr(d, "scheme") as string | null) ?? null;
            const host = (attr(d, "host") as string | null) ?? null;
            const pathPrefix = (attr(d, "pathPrefix") as string | null) ?? (attr(d, "path") as string | null) ?? null;
            if (host || scheme) {
              result.deepLinks.push({ host, scheme, pathPrefix, autoVerify: !!autoVerify, activity: name });
            }
          }
        }
        break;
      }
      case "service": {
        result.components.services.push({
          name: String(attr(el, "name") ?? ""),
          exported: attr(el, "exported") as boolean | null,
          foregroundServiceType: (attr(el, "foregroundServiceType") as string | null) ?? null,
        });
        result.summary.servicesCount++;
        break;
      }
      case "receiver": {
        result.components.receivers.push({
          name: String(attr(el, "name") ?? ""),
          exported: attr(el, "exported") as boolean | null,
        });
        result.summary.receiversCount++;
        break;
      }
      case "provider": {
        result.components.providers.push({
          name: String(attr(el, "name") ?? ""),
          exported: attr(el, "exported") as boolean | null,
          authorities: (attr(el, "authorities") as string | null) ?? null,
        });
        result.summary.providersCount++;
        break;
      }
    }
    void parentName;
  });

  return result;
}

// SDK detection based on file paths inside the AAB
export function detectSdks(fileList: string[]): Array<{ name: string; evidence: string; severity: Severity }> {
  const rules: Array<{ name: string; re: RegExp; severity: Severity }> = [
    { name: "Firebase Analytics",   re: /firebase[-_/]analytics/i, severity: "info" },
    { name: "Firebase Messaging",   re: /firebase[-_/]messaging/i, severity: "info" },
    { name: "Firebase Crashlytics", re: /crashlytics/i, severity: "info" },
    { name: "Firebase Auth",        re: /firebase[-_/]auth/i, severity: "info" },
    { name: "Google Play Services", re: /google[-_/]play[-_/]services|com\.google\.android\.gms/i, severity: "info" },
    { name: "Google AdMob",         re: /admob|com\.google\.android\.gms\.ads/i, severity: "warning" },
    { name: "Facebook SDK",         re: /facebook[-_/]android|com\.facebook\.sdk/i, severity: "warning" },
    { name: "OneSignal",            re: /onesignal/i, severity: "info" },
    { name: "Kotlin Runtime",       re: /kotlin[-_/]stdlib/i, severity: "safe" },
    { name: "AndroidX Core",        re: /androidx[-_/]core/i, severity: "safe" },
    { name: "Stripe",               re: /com\.stripe/i, severity: "info" },
    { name: "RevenueCat",           re: /com\.revenuecat/i, severity: "info" },
    { name: "WebView (Capacitor)",  re: /capacitor|ionic/i, severity: "info" },
    { name: "React Native",         re: /com\.facebook\.react/i, severity: "info" },
    { name: "Flutter Engine",       re: /io\.flutter/i, severity: "info" },
  ];
  const seen = new Set<string>();
  const out: Array<{ name: string; evidence: string; severity: Severity }> = [];
  for (const path of fileList) {
    for (const r of rules) {
      if (r.re.test(path) && !seen.has(r.name)) {
        seen.add(r.name);
        out.push({ name: r.name, evidence: path, severity: r.severity });
      }
    }
  }
  return out;
}

export function buildFindings(m: ExtractedManifest, sdks: ReturnType<typeof detectSdks>): Finding[] {
  const findings: Finding[] = [];

  // 1) Permissions
  for (const p of m.permissions) {
    const meta = PERMISSION_META[p.name] ?? fallbackPermissionMeta(p.name);
    findings.push({
      key: p.name,
      category: "permission",
      title: meta.title ?? p.name,
      severity: meta.severity,
      location: { file: "AndroidManifest.xml", element: `<uses-permission android:name="${p.name}"/>` },
      evidence: `Declarada em uses-permission${p.maxSdk ? ` (maxSdk=${p.maxSdk})` : ""}`,
      androidRule: (meta as { androidRule?: string }).androidRule,
      playStorePolicy: (meta as { playStorePolicy?: string }).playStorePolicy,
      docs: meta.docs,
      policyUrl: (meta as { policyUrl?: string }).policyUrl,
    });
  }

  // 2) Cleartext traffic
  if (m.summary.usesCleartextTraffic === true) {
    findings.push({
      key: "manifest.usesCleartextTraffic",
      category: "network",
      title: "Tráfego HTTP em texto claro habilitado",
      severity: "warning",
      location: { file: "AndroidManifest.xml", element: "<application>", attribute: "android:usesCleartextTraffic" },
      evidence: 'android:usesCleartextTraffic="true"',
      androidRule: "Android 9+ bloqueia HTTP por padrão; habilitar volta a permitir",
      docs: "https://developer.android.com/privacy-and-security/security-config",
      playStorePolicy: "Play Store — Data Safety (transmissão em texto claro)",
      policyUrl: "https://support.google.com/googleplay/android-developer/answer/10787469",
    });
  }

  // 3) Missing network security config with cleartext ambiguous
  if (m.summary.usesCleartextTraffic === null && !m.summary.networkSecurityConfig) {
    findings.push({
      key: "manifest.networkSecurityConfig.missing",
      category: "network",
      title: "networkSecurityConfig não declarado",
      severity: "info",
      location: { file: "AndroidManifest.xml", element: "<application>" },
      evidence: "Sem android:networkSecurityConfig e sem android:usesCleartextTraffic explícito",
      docs: "https://developer.android.com/privacy-and-security/security-config",
    });
  }

  // 4) allowBackup=true
  if (m.summary.allowBackup === true) {
    findings.push({
      key: "manifest.allowBackup",
      category: "security",
      title: "Backup automático habilitado",
      severity: "warning",
      location: { file: "AndroidManifest.xml", element: "<application>", attribute: "android:allowBackup" },
      evidence: 'android:allowBackup="true"',
      androidRule: "Pode expor dados sensíveis via adb backup / Google Drive",
      docs: "https://developer.android.com/guide/topics/data/autobackup",
    });
  }

  // 5) targetSdk desatualizado
  if (m.summary.targetSdk !== null && m.summary.targetSdk < 34) {
    findings.push({
      key: "manifest.targetSdk.outdated",
      category: "policy",
      title: `targetSdkVersion ${m.summary.targetSdk} abaixo do exigido pela Play Store`,
      severity: m.summary.targetSdk < 33 ? "critical" : "warning",
      location: { file: "AndroidManifest.xml", element: "<uses-sdk>", attribute: "android:targetSdkVersion" },
      evidence: `android:targetSdkVersion="${m.summary.targetSdk}"`,
      androidRule: "Play Store exige targetSdk ≥ 34 para novos apps/atualizações (2024)",
      docs: "https://developer.android.com/google/play/requirements/target-sdk",
      playStorePolicy: "Target API level requirements",
      policyUrl: "https://support.google.com/googleplay/android-developer/answer/11926878",
    });
  }

  // 6) Exported components sem permissão
  for (const c of m.components.activities) {
    if (c.exported === true && c.intentFilters === 0) {
      findings.push({
        key: `manifest.exported.activity:${c.name}`,
        category: "security",
        title: `Activity exportada sem intent-filter: ${c.name}`,
        severity: "warning",
        location: { file: "AndroidManifest.xml", element: `<activity android:name="${c.name}">`, attribute: "android:exported" },
        evidence: 'android:exported="true" sem <intent-filter>',
        docs: "https://developer.android.com/guide/topics/manifest/activity-element#exported",
        androidRule: "Android 12+: exported deve ser declarado e restringido quando não necessário",
      });
    }
  }
  for (const c of m.components.services) {
    if (c.exported === true) {
      findings.push({
        key: `manifest.exported.service:${c.name}`,
        category: "security",
        title: `Service exportado: ${c.name}`,
        severity: "warning",
        location: { file: "AndroidManifest.xml", element: `<service android:name="${c.name}">` },
        evidence: 'android:exported="true"',
        docs: "https://developer.android.com/guide/topics/manifest/service-element",
      });
    }
    if (c.foregroundServiceType === null && m.summary.targetSdk !== null && m.summary.targetSdk >= 34) {
      findings.push({
        key: `manifest.foregroundServiceType.missing:${c.name}`,
        category: "policy",
        title: `Foreground service sem foregroundServiceType: ${c.name}`,
        severity: "critical",
        location: { file: "AndroidManifest.xml", element: `<service android:name="${c.name}">` },
        evidence: "Ausência de android:foregroundServiceType",
        androidRule: "Android 14 (API 34+): obrigatório para foreground services",
        docs: "https://developer.android.com/about/versions/14/changes/fgs-types-required",
        policyUrl: "https://support.google.com/googleplay/android-developer/answer/13392821",
        playStorePolicy: "Foreground Service Types",
      });
    }
  }
  for (const c of m.components.providers) {
    if (c.exported === true) {
      findings.push({
        key: `manifest.exported.provider:${c.name}`,
        category: "security",
        title: `ContentProvider exportado: ${c.name}`,
        severity: "critical",
        location: { file: "AndroidManifest.xml", element: `<provider android:name="${c.name}">` },
        evidence: `android:exported="true", authorities="${c.authorities ?? ""}"`,
        docs: "https://developer.android.com/guide/topics/providers/content-provider-basics",
      });
    }
  }

  // 7) Deep links sem autoVerify
  for (const dl of m.deepLinks) {
    if ((dl.scheme === "https" || dl.scheme === "http") && !dl.autoVerify) {
      findings.push({
        key: `manifest.deepLink.autoVerify:${dl.activity}:${dl.host ?? ""}`,
        category: "policy",
        title: `Deep link ${dl.scheme}://${dl.host ?? "*"} sem autoVerify`,
        severity: "warning",
        location: { file: "AndroidManifest.xml", element: `<intent-filter> em ${dl.activity}` },
        evidence: `<data android:scheme="${dl.scheme}" android:host="${dl.host}"/> sem autoVerify="true"`,
        androidRule: "Android App Links exigem autoVerify + assetlinks.json publicado",
        docs: "https://developer.android.com/training/app-links/verify-android-applinks",
      });
    }
  }

  // 8) SDK findings
  for (const s of sdks) {
    if (s.severity !== "safe") {
      findings.push({
        key: `sdk:${s.name}`,
        category: "sdk",
        title: `SDK detectado: ${s.name}`,
        severity: s.severity,
        location: { file: s.evidence },
        evidence: `Arquivo/pacote presente: ${s.evidence}`,
        docs: "https://developer.android.com/distribute/best-practices/develop/data-safety",
        policyUrl: "https://support.google.com/googleplay/android-developer/answer/10787469",
        playStorePolicy: "Data Safety — SDKs de terceiros",
      });
    }
  }

  return findings;
}

// Score: 100 - Σ(peso × count), clamp 0..100. Pesos: critical=15, warning=5, info=1.
export function calculateScore(findings: Finding[]) {
  const weights: Record<Severity, number> = { critical: 15, warning: 5, info: 1, safe: 0 };
  const counts = { critical: 0, warning: 0, info: 0, safe: 0 };
  for (const f of findings) counts[f.severity]++;
  const deduction = counts.critical * weights.critical + counts.warning * weights.warning + counts.info * weights.info;
  const score = Math.max(0, Math.min(100, 100 - deduction));
  return {
    score,
    breakdown: {
      counts,
      weights,
      formula: "score = 100 − (critical×15 + warning×5 + info×1), clamp 0..100",
      deduction,
      totalItems: findings.length,
    },
  };
}
