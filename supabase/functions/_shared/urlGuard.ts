// ─────────────────────────────────────────────────────────────────────────────
// urlGuard.ts — Enterprise SSRF defense for Edge Functions
//
// Responsibilities:
//   • Canonicalize and validate URLs (scheme, port, hostname, encoded forms)
//   • Reject private / loopback / link-local / CGNAT / multicast / reserved IPs
//   • Reject cloud-metadata endpoints (AWS / GCP / Azure / Alibaba / DO / Oracle)
//   • Resolve DNS (A + AAAA), pin records, and validate every resolved address
//   • Reject dangerous schemes (file, gopher, ftp, data, javascript, vbscript)
//   • Reject dangerous ports (SSH, SMTP, internal admin, DB, redis, memcached…)
//   • Reject hostname forms that historically bypass naive guards
//     (decimal IP, octal IP, hex IP, "0", "0x...", mixed-encoding, [::ffff:…])
//
// Designed to be used by safeFetch — never call fetch() directly on
// user-supplied URLs without going through assertUrlIsSafe() first.
// ─────────────────────────────────────────────────────────────────────────────

export interface UrlGuardOptions {
  /** Allowed URL schemes. Default: ["https:"]. */
  allowedProtocols?: string[];
  /** Extra hostnames to allow even if they look private (rare, opt-in only). */
  hostnameAllowlist?: string[];
  /** Extra hostnames to always deny. */
  hostnameDenylist?: string[];
  /** Allow non-standard ports. Default: only 443 (https) and 80 (http if allowed). */
  allowedPorts?: number[];
}

export class UrlGuardError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "UrlGuardError";
  }
}

// ── constants ────────────────────────────────────────────────────────────────

const DANGEROUS_PORTS = new Set<number>([
  22,    // SSH
  23,    // Telnet
  25,    // SMTP
  53,    // DNS
  110,   // POP3
  111,   // RPC
  135,   // Windows RPC
  139,   // NetBIOS
  445,   // SMB
  465,   // SMTPS
  587,   // SMTP submission
  993,   // IMAPS
  995,   // POP3S
  1433,  // MSSQL
  1521,  // Oracle
  2049,  // NFS
  2375,  // Docker daemon
  2376,  // Docker daemon TLS
  3306,  // MySQL
  3389,  // RDP
  4444,  // Common malware
  5432,  // PostgreSQL
  5601,  // Kibana
  5672,  // RabbitMQ
  5984,  // CouchDB
  6379,  // Redis
  6443,  // Kubernetes API
  7001,  // WebLogic
  8009,  // AJP (Tomcat)
  8086,  // InfluxDB
  9000,  // SonarQube/Portainer
  9092,  // Kafka
  9200,  // Elasticsearch
  9300,  // Elasticsearch
  11211, // Memcached
  15672, // RabbitMQ mgmt
  27017, // MongoDB
  27018, // MongoDB
  27019, // MongoDB
  50070, // Hadoop
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".intranet",
  ".corp",
  ".lan",
  ".home",
  ".private",
  ".cluster.local",
];

const BLOCKED_HOSTNAMES_EXACT = new Set<string>([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  // Cloud metadata
  "metadata.google.internal",
  "metadata",
  "instance-data",
  "instance-data.ec2.internal",
]);

// IPs reserved for cloud-instance metadata services.
const METADATA_IPS = new Set<string>([
  "169.254.169.254", // AWS / GCP / Azure / OpenStack / DO / Oracle / Alibaba
  "100.100.100.200", // Alibaba Cloud
  "fd00:ec2::254",   // AWS IPv6 metadata
]);

// ── helpers ──────────────────────────────────────────────────────────────────

const between = (n: number, lo: number, hi: number) => n >= lo && n <= hi;

/** True if an IPv4 dotted-quad is in any private / reserved range. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true; // malformed → treat as unsafe
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = nums;
  if (a === 0) return true;                  // 0.0.0.0/8
  if (a === 10) return true;                 // RFC1918
  if (a === 127) return true;                // loopback
  if (a === 169 && b === 254) return true;   // link-local + AWS metadata range
  if (a === 172 && between(b, 16, 31)) return true; // RFC1918
  if (a === 192 && b === 0) return true;     // 192.0.0.0/24 + 192.0.2.0/24 reserved
  if (a === 192 && b === 168) return true;   // RFC1918
  if (a === 198 && between(b, 18, 19)) return true; // benchmarking
  if (a === 100 && between(b, 64, 127)) return true; // CGNAT
  if (a === 192 && b === 88 && nums[2] === 99) return true; // 6to4 anycast (deprecated)
  if (a >= 224) return true;                 // multicast (224/4) + reserved (240/4) + 255.255.255.255
  return false;
}

/** True if an IPv6 address is loopback / unique-local / link-local / mapped-private. */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::" || lower === "::1") return true;
  // Unique local fc00::/7  → first byte 0xfc or 0xfd
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
  // Link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  // Multicast ff00::/8
  if (/^ff[0-9a-f]{2}:/.test(lower)) return true;
  // Discard prefix 100::/64
  if (/^0*100:/.test(lower)) return true;
  // 6to4 / Teredo
  if (lower.startsWith("2002:") || lower.startsWith("2001:0:")) return true;
  // IPv4-mapped (::ffff:a.b.c.d) → validate underlying IPv4
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  // IPv4-mapped (::ffff:abcd:abcd hex form)
  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    const a = (hi >> 8) & 0xff, b = hi & 0xff, c = (lo >> 8) & 0xff, d = lo & 0xff;
    return isPrivateIPv4(`${a}.${b}.${c}.${d}`);
  }
  return false;
}

/**
 * Detect numeric IP-in-hostname forms historically used to bypass SSRF guards:
 *   decimal:  http://2130706433/        (=127.0.0.1)
 *   octal:    http://0177.0.0.1/        (=127.0.0.1)
 *   hex:      http://0x7f.0.0.1/
 *   single-0: http://0/                 (=0.0.0.0)
 *   short:    http://127.1/             (=127.0.0.1)
 * Returns the canonical dotted-quad, or null if not a numeric IP form.
 */
function decodeNumericIPv4(host: string): string | null {
  const h = host.trim();
  if (h === "") return null;

  // Pure decimal integer → 32-bit IPv4
  if (/^\d+$/.test(h)) {
    const n = Number(h);
    if (Number.isFinite(n) && n >= 0 && n <= 0xffffffff) {
      const a = (n >>> 24) & 0xff, b = (n >>> 16) & 0xff, c = (n >>> 8) & 0xff, d = n & 0xff;
      return `${a}.${b}.${c}.${d}`;
    }
  }

  // Hex form 0x... or single dotted hex
  if (/^0x[0-9a-f]+$/i.test(h)) {
    const n = parseInt(h, 16);
    if (Number.isFinite(n) && n >= 0 && n <= 0xffffffff) {
      const a = (n >>> 24) & 0xff, b = (n >>> 16) & 0xff, c = (n >>> 8) & 0xff, d = n & 0xff;
      return `${a}.${b}.${c}.${d}`;
    }
  }

  // Dotted form with octal/hex/decimal parts (e.g. 0177.0.0.1, 0x7f.0.0.1, 127.1)
  const parts = h.split(".");
  if (parts.length >= 2 && parts.length <= 4 && parts.every((p) => /^(0x[0-9a-f]+|\d+)$/i.test(p))) {
    const nums = parts.map((p) => {
      if (/^0x/i.test(p)) return parseInt(p, 16);
      if (/^0\d+$/.test(p)) return parseInt(p, 8);
      return parseInt(p, 10);
    });
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
    // Pad: e.g. 127.1 → 127.0.0.1
    let combined = 0;
    if (nums.length === 4) {
      if (nums.some((n) => n > 255)) return null;
      combined = (nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3];
    } else if (nums.length === 3) {
      if (nums[0] > 255 || nums[1] > 255 || nums[2] > 0xffff) return null;
      combined = (nums[0] << 24) | (nums[1] << 16) | nums[2];
    } else if (nums.length === 2) {
      if (nums[0] > 255 || nums[1] > 0xffffff) return null;
      combined = (nums[0] << 24) | nums[1];
    }
    combined = combined >>> 0;
    const a = (combined >>> 24) & 0xff, b = (combined >>> 16) & 0xff, c = (combined >>> 8) & 0xff, d = combined & 0xff;
    return `${a}.${b}.${c}.${d}`;
  }

  return null;
}

/** Resolve A + AAAA records via Deno DNS. Returns [] on failure. */
async function resolveAll(hostname: string): Promise<string[]> {
  const results: string[] = [];
  const tryResolve = async (rt: "A" | "AAAA") => {
    try {
      // @ts-ignore Deno is available in the edge runtime
      const r = await Deno.resolveDns(hostname, rt);
      if (Array.isArray(r)) results.push(...r);
    } catch {
      /* swallow per record-type */
    }
  };
  await Promise.all([tryResolve("A"), tryResolve("AAAA")]);
  return results;
}

// ── main API ─────────────────────────────────────────────────────────────────

export interface SafeUrl {
  /** The original href (canonicalized by URL parser). */
  href: string;
  /** Parsed URL object. */
  url: URL;
  /** Pinned IPs (A + AAAA) that the hostname resolves to. */
  resolvedIps: string[];
}

/**
 * Throws UrlGuardError if the URL is unsafe to fetch from the server.
 * Returns the canonical URL + pinned resolved IPs for use by safeFetch.
 */
export async function assertUrlIsSafe(rawUrl: string, opts: UrlGuardOptions = {}): Promise<SafeUrl> {
  const allowedProtocols = opts.allowedProtocols ?? ["https:"];
  const allowedPorts = opts.allowedPorts ?? (allowedProtocols.includes("http:") ? [80, 443] : [443]);

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UrlGuardError("INVALID_URL", "URL malformada.");
  }

  // 1. Protocol
  if (!allowedProtocols.includes(url.protocol)) {
    throw new UrlGuardError("BAD_PROTOCOL", `Protocolo não permitido: ${url.protocol}`);
  }

  // 2. Userinfo (credentials embedded in URL → reject)
  if (url.username || url.password) {
    throw new UrlGuardError("USERINFO_FORBIDDEN", "URLs com credenciais embutidas não são permitidas.");
  }

  // 3. Port
  const portNum = url.port ? Number(url.port) : (url.protocol === "https:" ? 443 : 80);
  if (DANGEROUS_PORTS.has(portNum)) {
    throw new UrlGuardError("DANGEROUS_PORT", `Porta bloqueada: ${portNum}`);
  }
  if (!allowedPorts.includes(portNum)) {
    throw new UrlGuardError("PORT_NOT_ALLOWED", `Porta não permitida: ${portNum}`);
  }

  // 4. Hostname canonicalization
  let hostname = url.hostname.toLowerCase();
  // Strip surrounding brackets from IPv6 literal
  hostname = hostname.replace(/^\[|\]$/g, "");

  if (!hostname) throw new UrlGuardError("NO_HOST", "Hostname ausente.");

  // 5. Explicit hostname blocklist
  if (BLOCKED_HOSTNAMES_EXACT.has(hostname)) {
    throw new UrlGuardError("HOSTNAME_BLOCKED", `Hostname bloqueado: ${hostname}`);
  }
  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (hostname === suffix.slice(1) || hostname.endsWith(suffix)) {
      throw new UrlGuardError("HOSTNAME_BLOCKED", `Hostname interno bloqueado: ${hostname}`);
    }
  }
  if (opts.hostnameDenylist?.some((h) => hostname === h.toLowerCase() || hostname.endsWith(`.${h.toLowerCase()}`))) {
    throw new UrlGuardError("HOSTNAME_DENYLISTED", `Hostname negado: ${hostname}`);
  }

  const allowlisted =
    opts.hostnameAllowlist?.some((h) => hostname === h.toLowerCase() || hostname.endsWith(`.${h.toLowerCase()}`)) ??
    false;

  // 6. Detect numeric / encoded IPv4 forms
  const decoded = decodeNumericIPv4(hostname);
  const ipv4Candidate = decoded ?? (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ? hostname : null);
  if (ipv4Candidate) {
    if (METADATA_IPS.has(ipv4Candidate)) {
      throw new UrlGuardError("METADATA_IP", `IP de metadata de instância bloqueado: ${ipv4Candidate}`);
    }
    if (!allowlisted && isPrivateIPv4(ipv4Candidate)) {
      throw new UrlGuardError("PRIVATE_IP", `IP privado/reservado bloqueado: ${ipv4Candidate}`);
    }
    return { href: url.href, url, resolvedIps: [ipv4Candidate] };
  }

  // 7. Detect IPv6 literal
  if (hostname.includes(":")) {
    if (METADATA_IPS.has(hostname)) {
      throw new UrlGuardError("METADATA_IP", `IPv6 de metadata bloqueado: ${hostname}`);
    }
    if (!allowlisted && isPrivateIPv6(hostname)) {
      throw new UrlGuardError("PRIVATE_IP", `IPv6 privado/reservado bloqueado: ${hostname}`);
    }
    return { href: url.href, url, resolvedIps: [hostname] };
  }

  // 8. Hostname → DNS resolve + validate every record
  if (allowlisted) {
    return { href: url.href, url, resolvedIps: [] };
  }

  const ips = await resolveAll(hostname);
  if (ips.length === 0) {
    throw new UrlGuardError("DNS_EMPTY", `Falha ao resolver DNS para ${hostname}.`);
  }
  for (const ip of ips) {
    if (METADATA_IPS.has(ip)) {
      throw new UrlGuardError("METADATA_IP", `${hostname} resolve para IP de metadata: ${ip}`);
    }
    const isV6 = ip.includes(":");
    if (isV6 ? isPrivateIPv6(ip) : isPrivateIPv4(ip)) {
      throw new UrlGuardError("PRIVATE_IP", `${hostname} resolve para IP privado: ${ip}`);
    }
  }

  return { href: url.href, url, resolvedIps: ips };
}

/** Boolean helper — never throws. */
export async function isUrlSafe(rawUrl: string, opts?: UrlGuardOptions): Promise<boolean> {
  try {
    await assertUrlIsSafe(rawUrl, opts);
    return true;
  } catch {
    return false;
  }
}
