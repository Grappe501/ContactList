type LogLevel = "info" | "warn" | "error";

function redactString(s: string): string {
  const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const phone = /\+?1?\D?\(?\d{3}\)?\D?\d{3}\D?\d{4}/g;
  return s.replace(email, "[REDACTED_EMAIL]").replace(phone, "[REDACTED_PHONE]");
}

function safeValue(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === "string") return redactString(v);
  if (Array.isArray(v)) return v.map(safeValue);
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k.toLowerCase().includes("raw_payload")) out[k] = "[REDACTED_RAW_PAYLOAD]";
      else out[k] = safeValue(val);
    }
    return out;
  }
  return v;
}

function safeRecord(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = safeValue(v);
  return out;
}

function log(level: LogLevel, data: Record<string, unknown>, msg?: string) {
  const line: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    msg: msg ?? null,
    ...safeRecord(data),
  };

  if (level === "error") console.error(JSON.stringify(line));
  else if (level === "warn") console.warn(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

export const logger = {
  info: (data: Record<string, unknown>, msg?: string) => log("info", data, msg),
  warn: (data: Record<string, unknown>, msg?: string) => log("warn", data, msg),
  error: (data: Record<string, unknown>, msg?: string) => log("error", data, msg),
};
