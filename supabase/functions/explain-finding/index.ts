// ─────────────────────────────────────────────────────────────────────────────
// explain-finding — contextual AI explanations for a specific finding of an analysis.
// Uses the curated knowledge base as grounding when available;
// falls back to fully AI-generated when the finding is new.
// Cached in validator_ai_explanations per (analysis_id, finding_key).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders as baseCors } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  ...baseCors,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Finding = {
  key: string;
  category: string;
  title: string;
  severity: "critical" | "warning" | "info" | "safe";
  location: { file: string; element?: string; attribute?: string };
  evidence: string;
  androidRule?: string;
  playStorePolicy?: string;
  docs: string;
  policyUrl?: string;
};

const SYSTEM_PROMPT = `Você é um auditor sênior de Android/Play Console. Responda SEMPRE em JSON válido com este shape exato:
{
  "explanation": string (2-4 frases explicando este achado ESPECÍFICO deste app),
  "impact": string (impacto técnico neste app, mencionando package/targetSdk quando útil),
  "playStoreRisk": string (risco concreto de aprovação/remoção na Play Store),
  "securityRisk": string (risco de segurança para os usuários),
  "recommendation": {
    "steps": string[] (3-5 passos acionáveis para ESTE app),
    "manifestSnippet": string (trecho corrigido do AndroidManifest.xml OU string vazia se não aplicável),
    "codeSnippet": string (trecho de código Java/Kotlin OU string vazia),
    "androidCompat": string[] (2-3 itens: "Android 13: ...", "Android 14: ...", "Android 15: ...")
  }
}
Regras:
- Nunca invente URLs. Use os links oficiais fornecidos no contexto.
- Nunca use textos genéricos "isso é uma permissão sensível". Cite package name, targetSdk, arquivo, elemento.
- Se o app já não está afetado (severidade safe), diga isso claramente em explanation e retorne recomendação de monitoramento.
- Português brasileiro.`;

async function callLovableAI(userPrompt: string): Promise<Record<string, unknown> | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function heuristicFallback(finding: Finding, context: { packageName?: string | null; targetSdk?: number | null }) {
  const target = context.targetSdk ?? "?";
  const pkg = context.packageName ?? "app analisado";
  return {
    explanation: `A análise do bundle ${pkg} identificou "${finding.title}" em ${finding.location.file}${finding.location.element ? ` (${finding.location.element})` : ""}. Evidência: ${finding.evidence}.`,
    impact: `Impacto varia conforme o targetSdk atual (${target}) e o uso real do componente. ${finding.androidRule ? `Regra Android relacionada: ${finding.androidRule}.` : ""}`,
    playStoreRisk: finding.playStorePolicy
      ? `Relacionado à política "${finding.playStorePolicy}" da Google Play — pode gerar review manual ou rejeição.`
      : "Risco depende da declaração no formulário Data Safety da Play Console.",
    securityRisk: finding.severity === "critical"
      ? "Vetor de ataque relevante se explorado — priorize correção antes da publicação."
      : "Risco moderado, revisar implementação.",
    recommendation: {
      steps: [
        `Localize a declaração em ${finding.location.file}${finding.location.element ? ` (${finding.location.element})` : ""}.`,
        "Remova a declaração ou restrinja seu escopo se não for essencial ao produto.",
        "Se essencial, prepare justificativa alinhada à política oficial.",
        "Re-envie ao Aurora Validator após ajustes para confirmar a correção.",
      ],
      manifestSnippet: "",
      codeSnippet: "",
      androidCompat: ["Android 13: revisar granular media perms", "Android 14: foreground service types", "Android 15: partial screen sharing / photo picker"],
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "missing_authorization" });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData.user) return json(401, { error: "invalid_token" });
  const userId = userData.user.id;

  let body: { analysis_id?: string; finding_key?: string };
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  if (!body.analysis_id || !body.finding_key) return json(400, { error: "analysis_id_and_finding_key_required" });

  // Cache hit?
  const { data: cached } = await supabase
    .from("validator_ai_explanations")
    .select("*")
    .eq("analysis_id", body.analysis_id)
    .eq("finding_key", body.finding_key)
    .maybeSingle();
  if (cached) return json(200, { cached: true, ...cached.payload, source: cached.source });

  // Load analysis
  const { data: analysis, error: aErr } = await supabase
    .from("validator_analyses")
    .select("*")
    .eq("id", body.analysis_id)
    .single();
  if (aErr || !analysis) return json(404, { error: "analysis_not_found" });
  if (analysis.user_id !== userId) {
    // admin bypass via is_privileged
    const { data: priv } = await supabase.rpc("is_privileged", { _user_id: userId });
    if (!priv) return json(403, { error: "forbidden" });
  }

  const findings: Finding[] = Array.isArray(analysis.findings) ? analysis.findings : [];
  const finding = findings.find((f) => f.key === body.finding_key);
  if (!finding) return json(404, { error: "finding_not_found" });

  const context = {
    packageName: analysis.package_name,
    versionName: analysis.version_name,
    targetSdk: analysis.target_sdk,
    minSdk: analysis.min_sdk,
    permissionsCount: (analysis.permissions ?? []).length,
    componentsCount:
      (analysis.components?.activities?.length ?? 0) +
      (analysis.components?.services?.length ?? 0),
  };

  const userPrompt = `Analise este achado do Aurora Validator AI:

App analisado:
- packageName: ${context.packageName ?? "desconhecido"}
- versionName: ${context.versionName ?? "?"}
- targetSdk: ${context.targetSdk ?? "?"}
- minSdk: ${context.minSdk ?? "?"}
- Permissões declaradas: ${context.permissionsCount}

Finding:
- key: ${finding.key}
- categoria: ${finding.category}
- título: ${finding.title}
- severidade: ${finding.severity}
- arquivo: ${finding.location.file}
- elemento: ${finding.location.element ?? "-"}
- atributo: ${finding.location.attribute ?? "-"}
- evidência: ${finding.evidence}
- regra Android: ${finding.androidRule ?? "-"}
- política Play Store: ${finding.playStorePolicy ?? "-"}
- doc oficial: ${finding.docs}
- link política: ${finding.policyUrl ?? "-"}

Gere a explicação contextual em JSON conforme o schema do system prompt. Cite package name e targetSdk quando fizer sentido. Use os links fornecidos, não invente URLs.`;

  const aiResult = await callLovableAI(userPrompt);
  const source: string = aiResult ? "ai" : "heuristic";
  const explanation = aiResult ?? heuristicFallback(finding, context);

  const payload = {
    ...explanation,
    key: finding.key,
    title: finding.title,
    severity: finding.severity,
    location: finding.location,
    docs: finding.docs,
    playStorePolicy: finding.playStorePolicy ?? null,
    policyUrl: finding.policyUrl ?? null,
  };

  await supabase.from("validator_ai_explanations").insert({
    analysis_id: body.analysis_id,
    user_id: analysis.user_id,
    finding_key: body.finding_key,
    source,
    severity: finding.severity,
    model: source === "ai" ? "google/gemini-3-flash-preview" : null,
    payload,
  });

  return json(200, { cached: false, source, ...payload });
});
