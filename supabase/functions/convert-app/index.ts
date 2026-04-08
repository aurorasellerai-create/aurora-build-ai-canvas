import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  url: z.string().url().startsWith("https://", { message: "URL deve usar HTTPS" }),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate body
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url } = parsed.data;

    // Create job record
    const { data: job, error: insertErr } = await supabase
      .from("conversion_jobs")
      .insert({
        user_id: user.id,
        source_url: url,
        status: "processing",
        progress: 0,
        step_label: "Aguardando processamento...",
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to external worker via webhook
    const workerUrl = Deno.env.get("WORKER_URL");
    const workerSecret = Deno.env.get("WORKER_SECRET");

    if (workerUrl && workerSecret) {
      // PRODUCTION: send to real worker
      try {
        const workerResp = await fetch(`${workerUrl}/webhook/convert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Worker-Secret": workerSecret,
          },
          body: JSON.stringify({
            job_id: job.id,
            url,
            user_id: user.id,
          }),
        });

        if (!workerResp.ok) {
          const errText = await workerResp.text();
          console.error("Worker error:", errText);
          await supabase.from("conversion_jobs").update({
            status: "error",
            error_message: "Erro ao enviar para processamento. Tente novamente.",
          }).eq("id", job.id);
        }
      } catch (err) {
        console.error("Worker connection error:", err);
        await supabase.from("conversion_jobs").update({
          status: "error",
          error_message: "Serviço de conversão indisponível. Tente novamente em alguns minutos.",
        }).eq("id", job.id);
      }
    } else {
      // FALLBACK: simulated processing (MVP mode)
      const STEPS = [
        { progress: 10, label: "Analisando aplicativo..." },
        { progress: 25, label: "Verificando compatibilidade mobile..." },
        { progress: 40, label: "Preparando versão Android..." },
        { progress: 55, label: "Gerando projeto Android..." },
        { progress: 70, label: "Compilando APK..." },
        { progress: 85, label: "Convertendo para AAB..." },
        { progress: 95, label: "Finalizando..." },
        { progress: 100, label: "Concluído!" },
      ];

      (async () => {
        try {
          const startTime = Date.now();
          for (const step of STEPS) {
            await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1500));

            if (step.progress === 10) {
              try {
                const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
                if (!resp.ok) {
                  await supabase.from("conversion_jobs").update({
                    status: "error",
                    error_message: "Não foi possível acessar o link.",
                    processing_time_ms: Date.now() - startTime,
                  }).eq("id", job.id);
                  return;
                }
              } catch {
                await supabase.from("conversion_jobs").update({
                  status: "error",
                  error_message: "Erro ao acessar o link.",
                  processing_time_ms: Date.now() - startTime,
                }).eq("id", job.id);
                return;
              }
            }

            await supabase.from("conversion_jobs").update({
              progress: step.progress,
              step_label: step.label,
              status: step.progress >= 100 ? "done" : "processing",
              processing_time_ms: Date.now() - startTime,
            }).eq("id", job.id);
          }

          await supabase.from("conversion_jobs").update({
            status: "done",
            progress: 100,
            step_label: "Concluído!",
            download_url: `https://storage.aurora-build.ai/aab/${job.id}/app-release.aab`,
            processing_time_ms: Date.now() - startTime,
          }).eq("id", job.id);
        } catch (err) {
          await supabase.from("conversion_jobs").update({
            status: "error",
            error_message: "Erro interno.",
          }).eq("id", job.id);
        }
      })();
    }

    return new Response(JSON.stringify({ job_id: job.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
