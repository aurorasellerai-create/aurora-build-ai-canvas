// ─────────────────────────────────────────────────────────────────────────────
// payloadGuard.ts — Request body size limits for Edge Functions.
//
// Prevents memory exhaustion / zip-bomb / huge-JSON abuse by:
//   • Rejecting Content-Length over the cap up front.
//   • Streaming the body and aborting once `maxBytes` is exceeded.
//   • Parsing JSON only after the size check passes.
//
// Defaults are conservative (256 KiB). Bump per-endpoint when needed.
// ─────────────────────────────────────────────────────────────────────────────

export class PayloadTooLargeError extends Error {
  readonly status = 413;
  readonly code = "PAYLOAD_TOO_LARGE";
  constructor(maxBytes: number) {
    super(`Request body excede limite (${maxBytes} bytes).`);
    this.name = "PayloadTooLargeError";
  }
}

export class InvalidJsonError extends Error {
  readonly status = 400;
  readonly code = "INVALID_JSON";
  constructor() {
    super("JSON inválido.");
    this.name = "InvalidJsonError";
  }
}

const DEFAULT_MAX_BYTES = 256 * 1024; // 256 KiB

/** Read request body as text with a hard size cap. Throws PayloadTooLargeError if exceeded. */
export async function readTextCapped(req: Request, maxBytes: number = DEFAULT_MAX_BYTES): Promise<string> {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }
  if (!req.body) return "";

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* noop */ }
        throw new PayloadTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  }
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.byteLength; }
  return new TextDecoder().decode(merged);
}

/** Read + parse JSON with size cap. Throws PayloadTooLargeError or InvalidJsonError. */
export async function readJsonCapped<T = unknown>(req: Request, maxBytes: number = DEFAULT_MAX_BYTES): Promise<T> {
  const text = await readTextCapped(req, maxBytes);
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new InvalidJsonError();
  }
}
