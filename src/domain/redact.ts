/** SEC-003: redact secrets from anything that may be logged, stored as diagnostics or sent to a client. */
const SECRET_KEYS = /^(authorization|cookie|set-cookie|x-api-key|x-subscription-token|api[-_]?key|apikey|token|access[-_]?token|refresh[-_]?token|secret|password|session[-_]?token|client[-_]?secret)$/i;
const SECRET_VALUE_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{8,}/g, // Anthropic keys
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\bBSA[A-Za-z0-9_-]{16,}\b/g, // Brave keys
  /\bfc_session=[A-Za-z0-9_-]+/g,
  /\b(token|key|secret)=([A-Za-z0-9._~-]{12,})/gi,
];
export const REDACTED = "[redacted]";

export function redactString(s: string): string {
  let out = s;
  for (const re of SECRET_VALUE_PATTERNS) out = out.replace(re, (m, k) => (typeof k === "string" && /^(token|key|secret)$/i.test(k) ? `${k}=${REDACTED}` : REDACTED));
  for (const v of envSecrets()) if (v.length >= 8) out = out.split(v).join(REDACTED);
  return out;
}

export function redact<T>(value: T, depth = 0): T {
  if (depth > 8) return REDACTED as T;
  if (typeof value === "string") return redactString(value) as T;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1)) as T;
  if (value instanceof Error) return { name: value.name, message: redactString(value.message) } as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SECRET_KEYS.test(k) ? REDACTED : redact(v, depth + 1);
    return out as T;
  }
  return value;
}

function envSecrets(): string[] {
  return [process.env.ANTHROPIC_API_KEY, process.env.BRAVE_API_KEY].filter((v): v is string => !!v);
}

export function log(level: "info" | "warn" | "error", msg: string, data?: unknown) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg: redactString(msg), ...(data === undefined ? {} : { data: redact(data) }) });
  (level === "error" ? console.error : console.log)(line);
}
