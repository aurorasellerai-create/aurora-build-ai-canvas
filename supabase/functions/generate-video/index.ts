import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SECURITY_RESPONSE_HEADERS } from "../_shared/safeFetch.ts";
import { readJsonCapped, PayloadTooLargeError, InvalidJsonError } from "../_shared/payloadGuard.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const ALLOWED_ORIGINS = [
  "https://aurorabuild.com.br",
  "https://www.aurorabuild.com.br",
  "https://aurora-build-ai-canvas.lovable.app",
];

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    ...SECURITY_RESPONSE_HEADERS,
  };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Rate limit: 5 video generations / 5min per user (high cost endpoint)
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const rl = await checkRateLimit(serviceClient, {
      endpoint: "generate-video",
      identity: user.id,
      max: 5,
      windowSeconds: 300,
    });
    if (!rl.allowed) return rateLimitResponse(rl, getCorsHeaders(req));

    let parsedBody: { description?: unknown; style?: unknown; duration?: unknown };
    try {
      parsedBody = await readJsonCapped(req, 8 * 1024);
    } catch (e) {
      if (e instanceof PayloadTooLargeError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 413, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (e instanceof InvalidJsonError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      throw e;
    }
    const { description, style, duration } = parsedBody;

    if (!description || typeof description !== "string" || description.trim().length < 3 || description.length > 500) {
      return new Response(JSON.stringify({ error: "Descrição deve ter entre 3 e 500 caracteres" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (style !== undefined && style !== null && (typeof style !== "string" || style.length > 100)) {
      return new Response(JSON.stringify({ error: "Style deve ter no máximo 100 caracteres" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const safeDescription = description.replace(/[\r\n]+/g, " ").slice(0, 500);
    const safeStyle = typeof style === "string" ? style.replace(/[\r\n]+/g, " ").slice(0, 100) : "";
    const videoDuration = duration === 10 ? 10 : 5;

    // Build prompt for AI to create an enhanced video description
    const systemPrompt = `You are a professional video director. The user will describe a video they want. 
Create an optimized, detailed prompt in English for an AI video generator. 
Focus on visual details, camera movement, lighting, and mood.
Keep it under 200 words. Return ONLY the enhanced prompt, nothing else.`;

    const userPrompt = `Video request: "${safeDescription}"${safeStyle ? ` Style: ${safeStyle}` : ""}. Duration: ${videoDuration} seconds.`;


    // Use Lovable AI to enhance the prompt
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const enhancedPrompt = aiData.choices?.[0]?.message?.content || description;

    // Return the enhanced prompt and metadata
    // The actual video generation happens client-side via the videogen tool integration
    return new Response(JSON.stringify({
      success: true,
      enhancedPrompt,
      duration: videoDuration,
      originalDescription: description,
      style: style || "cinematic",
    }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("generate-video error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
