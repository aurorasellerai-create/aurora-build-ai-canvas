// ─────────────────────────────────────────────────────────────────────────────
// safeFetch.ts — SSRF-hardened fetch wrapper for Edge Functions.
//
// Always use safeFetch() instead of fetch() when the URL comes (directly or
// indirectly) from a user. It enforces:
//   • urlGuard.assertUrlIsSafe()  on the initial URL and every redirect hop
//   • Manual redirect chain (max 3 hops) — no DNS-rebinding window
//   • Hard timeout via AbortController (default 8s)
//   • Response body size cap (default 2 MiB) to prevent OOM / resource abuse
//   • Strips Authorization / Cookie on cross-origin redirects
//   • Structured [SECURITY] logs for every block
// ─────────────────────────────────────────────────────────────────────────────

import { assertUrlIsSafe, UrlGuardError, type UrlGuardOptions } from "./urlGuard.ts";

export interface SafeFetchOptions extends Omit<RequestInit, "redirect" | "signal"> {
  /** Hard wall-clock timeout in ms. Default 8000. */
  timeoutMs?: number;
  /** Maximum redirect hops to follow. Default 3. */
  maxRedirects?: number;
  /** Max response body size in bytes. Default 2 MiB. */
  maxBytes?: number;
  /** URL-guard options forwarded to assertUrlIsSafe(). */
  urlGuard?: UrlGuardOptions;
  /** Correlation ID for structured logs. */
  correlationId?: string;
}

export class SafeFetchError extends Error {
  readonly code: string;
  readonly status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "SafeFetchError";
  }
}

function logSecurity(event: string, details: Record<string, unknown>) {
  try {
    console.warn(`[SECURITY] ${event} ${JSON.stringify(details)}`);
  } catch {
    console.warn(`[SECURITY] ${event}`);
  }
}

function stripSensitiveHeaders(headers: HeadersInit | undefined): Headers {
  const h = new Headers(headers ?? {});
  h.delete("authorization");
  h.delete("cookie");
  h.delete("proxy-authorization");
  return h;
}

/**
 * SSRF-hardened fetch. Throws SafeFetchError on policy violations.
 * The returned Response has a body limited to `maxBytes`.
 */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const {
    timeoutMs = 8000,
    maxRedirects = 3,
    maxBytes = 2 * 1024 * 1024,
    urlGuard,
    correlationId,
    headers,
    ...init
  } = opts;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let currentUrl = rawUrl;
  let currentHeaders = new Headers(headers ?? {});
  let originHost: string | null = null;

  try {
    for (let hop = 0; hop <= maxRedirects; hop++) {
      // 1. Validate the current URL (DNS-resolved + IP-pinned).
      let safe;
      try {
        safe = await assertUrlIsSafe(currentUrl, urlGuard);
      } catch (e) {
        const err = e as UrlGuardError;
        logSecurity("URL_BLOCKED", { url: currentUrl, code: err.code, hop, correlationId });
        throw new SafeFetchError(err.code ?? "URL_BLOCKED", err.message);
      }

      if (hop === 0) originHost = safe.url.hostname.toLowerCase();

      // 2. Cross-origin redirect → strip credentials.
      if (originHost && safe.url.hostname.toLowerCase() !== originHost) {
        currentHeaders = stripSensitiveHeaders(currentHeaders);
      }

      // 3. Issue the request with redirect: "manual" so WE control the chain.
      const response = await fetch(safe.href, {
        ...init,
        headers: currentHeaders,
        redirect: "manual",
        signal: controller.signal,
      });

      // 4. Handle redirect ourselves.
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        // Always consume the body to avoid resource leaks.
        try { await response.arrayBuffer(); } catch { /* noop */ }

        if (!location) {
          throw new SafeFetchError("BAD_REDIRECT", "Redirect sem header Location.", response.status);
        }
        if (hop >= maxRedirects) {
          logSecurity("REDIRECT_LIMIT", { from: currentUrl, to: location, correlationId });
          throw new SafeFetchError("REDIRECT_LIMIT", `Excedeu ${maxRedirects} redirects.`, response.status);
        }
        // Resolve relative redirects.
        currentUrl = new URL(location, safe.href).href;
        continue;
      }

      // 5. Enforce response size cap by streaming.
      if (response.body && maxBytes > 0) {
        const limited = await readWithCap(response, maxBytes, correlationId);
        return limited;
      }

      return response;
    }

    throw new SafeFetchError("REDIRECT_LIMIT", "Loop de redirect.");
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readWithCap(response: Response, maxBytes: number, correlationId?: string): Promise<Response> {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maxBytes) {
    try { await response.arrayBuffer(); } catch { /* noop */ }
    logSecurity("RESPONSE_TOO_LARGE", { contentLength, maxBytes, correlationId });
    throw new SafeFetchError("RESPONSE_TOO_LARGE", `Resposta excede limite (${maxBytes} bytes).`, response.status);
  }

  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* noop */ }
        logSecurity("RESPONSE_TOO_LARGE", { total, maxBytes, correlationId });
        throw new SafeFetchError("RESPONSE_TOO_LARGE", `Resposta excede limite (${maxBytes} bytes).`, response.status);
      }
      chunks.push(value);
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { merged.set(c, offset); offset += c.byteLength; }

  return new Response(merged, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/** Convenience: HEAD probe that returns true if the URL is reachable (2xx/3xx). */
export async function safeHead(url: string, opts: SafeFetchOptions = {}): Promise<boolean> {
  const res = await safeFetch(url, { ...opts, method: "HEAD", maxBytes: 0, maxRedirects: 0 });
  // We disabled auto-follow above, so 3xx without follow still means "reachable".
  return res.status >= 200 && res.status < 400;
}

/** Standard security response headers for edge function responses. */
export const SECURITY_RESPONSE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), interest-cohort=()",
  "Cache-Control": "no-store",
};
