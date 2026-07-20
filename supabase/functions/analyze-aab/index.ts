// ─────────────────────────────────────────────────────────────────────────────
// analyze-aab — real AAB analyzer (Deno / Supabase Edge Function).
// Downloads the AAB from Storage, unzips, decodes AndroidManifest.xml (AXML),
// extracts SDKs / permissions / signature / components, computes findings + score,
// and persists everything to public.validator_analyses.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { unzipSync } from "npm:fflate@0.8.2";
import { corsHeaders as baseCors } from "npm:@supabase/supabase-js@2/cors";
import { decodeAxml } from "./axml.ts";
import { extractManifest, detectSdks, buildFindings, calculateScore } from "./findingsEngine.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  ...baseCors,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseSignatureBlock(files: Record<string, Uint8Array>) {
  const metaInf = Object.keys(files).filter((k) => k.startsWith("META-INF/"));
  const certFile = metaInf.find((k) => /\.(RSA|EC|DSA)$/i.test(k));
  const hasV1 = !!certFile;
  // AAB signature blocks (v2/v3) live in the ZIP central directory — not extractable trivially in JS.
  // We surface what we can: presence of META-INF cert, algorithm hint from filename.
  const alg = certFile ? certFile.split(".").pop()?.toUpperCase() ?? null : null;
  return {
    hasV1Signature: hasV1,
    signatureAlgorithm: alg,
    signedByFilename: certFile ?? null,
    manifestMfPresent: metaInf.some((k) => /MANIFEST\.MF$/i.test(k)),
    signerCertificatePresent: hasV1,
    notes: hasV1
      ? "Bloco de assinatura v1 (JAR) detectado. v2/v3 são validados pelo bundletool no build final."
      : "Nenhum bloco META-INF de assinatura encontrado — o AAB pode não estar assinado.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "missing_authorization" });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  // Resolve user
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData.user) return json(401, { error: "invalid_token" });
  const userId = userData.user.id;

  let body: { storage_path?: string; file_name?: string; file_size?: number; project_id?: string; app_format?: string; correlation_id?: string };
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  if (!body.storage_path) return json(400, { error: "storage_path_required" });

  const correlationId = body.correlation_id ?? crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Create the analysis row upfront so the UI can subscribe to it immediately.
  const { data: inserted, error: insErr } = await supabase
    .from("validator_analyses")
    .insert({
      user_id: userId,
      project_id: body.project_id ?? null,
      storage_path: body.storage_path,
      file_name: body.file_name ?? body.storage_path.split("/").pop(),
      file_size: body.file_size ?? null,
      app_format: body.app_format ?? "aab",
      status: "processing",
      started_at: startedAt,
      correlation_id: correlationId,
    })
    .select("id")
    .single();
  if (insErr || !inserted) return json(500, { error: "insert_failed", detail: insErr?.message });
  const analysisId = inserted.id as string;

  // Do the heavy work; on any failure mark the row as failed.
  try {
    // Download AAB (path may or may not include bucket prefix)
    const path = body.storage_path.replace(/^aab-files\//, "");
    const { data: file, error: dlErr } = await supabase.storage.from("aab-files").download(path);
    if (dlErr || !file) throw new Error(`download_failed: ${dlErr?.message ?? "no file"}`);

    const buf = new Uint8Array(await file.arrayBuffer());
    const fileHash = await sha256Hex(buf);

    // If we already analysed this exact file for this user, reuse it and delete the placeholder row.
    const { data: cached } = await supabase
      .from("validator_analyses")
      .select("*")
      .eq("user_id", userId)
      .eq("file_hash", fileHash)
      .eq("status", "completed")
      .neq("id", analysisId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      await supabase.from("validator_analyses").delete().eq("id", analysisId);
      return json(200, { analysis_id: cached.id, cached: true });
    }

    // Unzip
    let entries: Record<string, Uint8Array>;
    try { entries = unzipSync(buf); } catch (e) {
      throw new Error(`unzip_failed: ${(e as Error).message}`);
    }

    const fileList = Object.keys(entries);
    const manifestBytes = entries["base/manifest/AndroidManifest.xml"] ?? entries["AndroidManifest.xml"];
    if (!manifestBytes) throw new Error("manifest_not_found_in_bundle");

    const tree = decodeAxml(manifestBytes);
    const manifest = extractManifest(tree);
    const sdks = detectSdks(fileList);
    const signature = parseSignatureBlock(entries);
    const findings = buildFindings(manifest, sdks);

    // Signature findings
    if (!signature.hasV1Signature) {
      findings.push({
        key: "signature.missing",
        category: "signature",
        title: "Assinatura não encontrada",
        severity: "critical",
        location: { file: "META-INF/" },
        evidence: signature.notes,
        docs: "https://developer.android.com/studio/publish/app-signing",
        androidRule: "AAB deve ser assinado para publicação",
      });
    }

    // DEX summary
    const dexEntries = Object.entries(entries).filter(([k]) => /\.dex$/i.test(k));
    const dexSummary = await Promise.all(dexEntries.map(async ([name, data]) => ({
      name,
      size: data.byteLength,
      sha256: await sha256Hex(data),
    })));

    const { score, breakdown } = calculateScore(findings);

    const payload = {
      file_hash: fileHash,
      package_name: manifest.summary.package,
      version_name: manifest.summary.versionName,
      version_code: manifest.summary.versionCode,
      min_sdk: manifest.summary.minSdk,
      target_sdk: manifest.summary.targetSdk,
      compile_sdk: manifest.summary.compileSdk,
      manifest: manifest.summary,
      permissions: manifest.permissions,
      sdks,
      apis: findings.filter((f) => f.category === "network" || f.category === "security").map((f) => ({
        key: f.key, title: f.title, severity: f.severity, location: f.location,
      })),
      deep_links: manifest.deepLinks,
      signature,
      components: manifest.components,
      bundle_config: { fileCount: fileList.length, hasBundleConfig: !!entries["BundleConfig.pb"] },
      dex_summary: dexSummary,
      findings,
      score,
      score_breakdown: breakdown,
      status: "completed",
      finished_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase.from("validator_analyses").update(payload).eq("id", analysisId);
    if (upErr) throw new Error(`update_failed: ${upErr.message}`);

    return json(200, { analysis_id: analysisId, cached: false, correlation_id: correlationId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("validator_analyses").update({
      status: "failed",
      error: msg,
      finished_at: new Date().toISOString(),
    }).eq("id", analysisId);
    return json(500, { error: "analysis_failed", detail: msg, analysis_id: analysisId });
  }
});
