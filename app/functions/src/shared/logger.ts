type LogLevel = "info" | "warn" | "error";

function redactString(s: string): string {
  // Redact emails/phones at a basic level (best-effort).
  // Never rely on this alone—do not log PII in the first place.
  const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const phone = /\+?1?\D?\(?\d{3}\)?\D?\d{3}\D?\d{4}/g;
  return s.replace(email, "[REDACTED_EMAIL]").replace(phone, "[REDACTED_PHONE]");
}

function safe(obj: unknown): unknown {
  if (obj == null) return obj;
  if (typeof obj === "string") return redactString(obj);
  if (Array.isArray(obj)) return obj.map(safe);
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      // Never log raw payloads
      if (k.toLowerCase().includes("raw_payload")) out[k] = "[REDACTED_RAW_PAYLOAD]";
      else out[k] = safe(v);
    }
    return out;
  }
  return obj;
}

function log(level: LogLevel, data: Record<string, unknown>, msg?: string) {
  const line = {
    level,
    time: new Date().toISOString(),
    msg: msg ?? null,
    ...safe(data),
  };
  // eslint-disable-next-line no-console
  if (level === "error") console.error(JSON.stringify(line));
  else if (level === "warn") console.warn(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

export const logger = {
  info: (data: Record<string, unknown>, msg?: string) => log("info", data, msg),
  warn: (data: Record<string, unknown>, msg?: string) => log("warn", data, msg),
  error: (data: Record<string, unknown>, msg?: string) => log("error", data, msg),
};
