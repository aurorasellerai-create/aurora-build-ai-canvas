const { Worker } = require("bullmq");
const { buildAAB, convertAABToUniversalAPK } = require("./pipeline");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STEPS = [
  { progress: 10, label: "Analisando aplicativo..." },
  { progress: 20, label: "Verificando compatibilidade mobile..." },
  { progress: 35, label: "Criando projeto Capacitor..." },
  { progress: 50, label: "Configurando WebView Android..." },
  { progress: 65, label: "Compilando projeto Android..." },
  { progress: 80, label: "Gerando AAB com Gradle..." },
  { progress: 90, label: "Fazendo upload do arquivo..." },
  { progress: 100, label: "Concluído!" },
];

const AAB_TO_APK_STEPS = [
  { progress: 10, label: "Recebendo AAB assinado..." },
  { progress: 25, label: "Validando arquivo Android App Bundle..." },
  { progress: 45, label: "Executando bundletool oficial do Google..." },
  { progress: 70, label: "Gerando APK universal para testes..." },
  { progress: 90, label: "Fazendo upload do APK..." },
  { progress: 100, label: "APK pronto para teste local!" },
];

async function updateJob(jobId, data) {
  const { error } = await supabase
    .from("conversion_jobs")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) console.error(`[DB] Error updating job ${jobId}:`, error.message);
}

async function updateProgress(jobId, stepIndex) {
  const step = STEPS[stepIndex];
  if (!step) return;
  await updateJob(jobId, {
    progress: step.progress,
    step_label: step.label,
    status: step.progress >= 100 ? "done" : "processing",
  });
}

async function updateAabToApkProgress(jobId, stepIndex) {
  const step = AAB_TO_APK_STEPS[stepIndex];
  if (!step) return;
  await updateJob(jobId, {
    progress: step.progress,
    step_label: step.label,
    status: step.progress >= 100 ? "done" : "processing",
  });
}

async function downloadFile(url, targetPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível baixar o AAB enviado.");
  const buffer = Buffer.from(await response.arrayBuffer());
  require("fs").writeFileSync(targetPath, buffer);
}

function startWorker(redisConnection) {
  const aabToApkWorker = new Worker(
    "aab-to-apk",
    async (job) => {
      const { job_id, aab_url, user_id } = job.data;
      const fs = require("fs");
      const path = require("path");
      const startTime = Date.now();
      const workDir = path.join("/tmp", `aurora-aab-input-${job_id}`);

      try {
        fs.mkdirSync(workDir, { recursive: true });
        await updateAabToApkProgress(job_id, 0);

        const aabPath = path.join(workDir, "source.aab");
        await downloadFile(aab_url, aabPath);
        await updateAabToApkProgress(job_id, 1);

        const result = await convertAABToUniversalAPK(aabPath, job_id, async (stepIndex) => {
          await updateAabToApkProgress(job_id, stepIndex);
        });

        await updateAabToApkProgress(job_id, 4);
        const fileBuffer = fs.readFileSync(result.apkPath);
        const storagePath = `apk/${job_id}/app-universal.apk`;
        const { error: uploadError } = await supabase.storage
          .from("aab-files")
          .upload(storagePath, fileBuffer, { contentType: "application/vnd.android.package-archive", upsert: true });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from("aab-files").getPublicUrl(storagePath);
        await updateJob(job_id, {
          status: "done",
          progress: 100,
          step_label: "APK pronto para teste local!",
          download_url: urlData.publicUrl,
          processing_time_ms: Date.now() - startTime,
        });

        await supabase.from("system_logs").insert({
          user_id,
          severity: "info",
          category: "conversion",
          message: "AAB converted to universal APK with bundletool",
          details: { job_id, method: "bundletool build-apks --mode=universal", processing_time_ms: Date.now() - startTime },
        });
      } catch (err) {
        console.error(`[WORKER] AAB→APK job ${job_id} failed:`, err.message);
        await updateJob(job_id, { status: "error", error_message: err.message || "Erro interno ao converter AAB para APK.", processing_time_ms: Date.now() - startTime });
      } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
        if (job_id) fs.rmSync(path.join("/tmp", `aurora-aab-to-apk-${job_id}`), { recursive: true, force: true });
      }
    },
    { connection: redisConnection, concurrency: 1, limiter: { max: 3, duration: 60000 } }
  );

  const worker = new Worker(
    "convert-aab",
    async (job) => {
      const { job_id, url, user_id } = job.data;
      const startTime = Date.now();

      console.log(`[WORKER] Processing job ${job_id} for URL: ${url}`);

      try {
        // Step 0: Analyzing
        await updateProgress(job_id, 0);

        // Step 1: Validate URL
        await updateProgress(job_id, 1);
        const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
        if (!resp.ok) {
          throw new Error("Não foi possível acessar o link. Verifique se a URL está correta.");
        }

        // Steps 2-5: Build pipeline
        await updateProgress(job_id, 2);
        const result = await buildAAB(url, job_id, async (stepIndex) => {
          await updateProgress(job_id, stepIndex);
        });

        // Step 6: Upload
        await updateProgress(job_id, 6);
        const aabPath = result.aabPath;
        const fs = require("fs");
        const fileBuffer = fs.readFileSync(aabPath);
        const storagePath = `aab/${job_id}/app-release.aab`;

        const { error: uploadError } = await supabase.storage
          .from("aab-files")
          .upload(storagePath, fileBuffer, {
            contentType: "application/octet-stream",
            upsert: true,
          });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from("aab-files")
          .getPublicUrl(storagePath);

        // Step 7: Done
        await updateJob(job_id, {
          status: "done",
          progress: 100,
          step_label: "Concluído!",
          download_url: urlData.publicUrl,
          processing_time_ms: Date.now() - startTime,
        });

        // Log
        await supabase.from("system_logs").insert({
          user_id,
          severity: "info",
          category: "conversion",
          message: `AAB conversion completed for ${url}`,
          details: { job_id, url, processing_time_ms: Date.now() - startTime },
        });

        console.log(`[WORKER] Job ${job_id} completed in ${Date.now() - startTime}ms`);

        // Cleanup
        const path = require("path");
        const buildDir = path.join("/tmp", `aurora-build-${job_id}`);
        fs.rmSync(buildDir, { recursive: true, force: true });
      } catch (err) {
        console.error(`[WORKER] Job ${job_id} failed:`, err.message);
        await updateJob(job_id, {
          status: "error",
          error_message: err.message || "Erro interno ao gerar o app.",
          processing_time_ms: Date.now() - startTime,
        });
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
      limiter: { max: 5, duration: 60000 },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[WORKER] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[WORKER] Job ${job?.id} failed:`, err.message);
  });

  console.log("[WORKER] Aurora AAB Worker started");
  return { worker, aabToApkWorker };
}

module.exports = { startWorker };
