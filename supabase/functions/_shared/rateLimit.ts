// ─────────────────────────────────────────────────────────────────────────────
// rateLimit.ts — SQL-backed sliding-window rate limit for Edge Functions.
//
// Backend: public.check_rate_limit(bucket_key, max_hits, window_seconds)
// Returns: { allowed, count, limit, retry_after_seconds }
//
// Fail-open by design — if the DB call fails, the request is allowed. This
// preserves availability of monetization / pipeline endpoints if the table is
// briefly unavailable. The miss is logged via console.warn for observability.
//
// Bucket-key best practice: combine endpoint + identity (userId preferred, IP
// hash as fallback). Use the helpers below.
// ─────────────────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  /** Identifier of the protected endpoint, e.g. "generate-business". */
  endpoint: string;
  /** Stable identity — userId, ipHash, or composite. */
  identity: string;
  /** Max hits permitted in the window. */
  max: number;
  /** Window size in seconds. */
  windowSeconds: number;
}

/**
 * Check a sliding-window rate limit. Fail-open on DB errors.
 * Caller must pass a Supabase client built with the SERVICE_ROLE_KEY.
 */
export async function checkRateLimit(
  serviceClient: SupabaseClient,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const bucketKey = `${opts.endpoint}:${opts.identity}`;
  try {
    const { data, error } = await serviceClient.rpc("check_rate_limit", {
      _bucket_key: bucketKey,
      _max_hits: opts.max,
      _window_seconds: opts.windowSeconds,
    });
    if (error || !data) {
      console.warn(`[SECURITY] {"evt":"RATE_LIMIT_DB_FAIL","bucket":"${bucketKey}","err":"${error?.message ?? "no_data"}"}`);
      return { allowed: true, count: 0, limit: opts.max, retryAfterSeconds: 0 };
    }
    const result: RateLimitResult = {
      allowed: Boolean(data.allowed),
      count: Number(data.count ?? 0),
      limit: Number(data.limit ?? opts.max),
      retryAfterSeconds: Number(data.retry_after_seconds ?? 0),
    };
    if (!result.allowed) {
      console.warn(`[SECURITY] {"evt":"RATE_LIMITED","bucket":"${bucketKey}","count":${result.count},"limit":${result.limit}}`);
    }
    return result;
  } catch (e) {
    console.warn(`[SECURITY] {"evt":"RATE_LIMIT_EXCEPTION","bucket":"${bucketKey}","err":"${(e as Error).message}"}`);
    return { allowed: true, count: 0, limit: opts.max, retryAfterSeconds: 0 };
  }
}

/** Build a 429 response with proper Retry-After header. */
export function rateLimitResponse(
  result: RateLimitResult,
  baseHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Muitas requisições. Aguarde e tente novamente.",
      retry_after_seconds: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

/** Stable short hash for IP fallback identity (FNV-1a, hex). */
export function ipHashFromRequest(req: Request): string {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (!ip) return "anon";
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
