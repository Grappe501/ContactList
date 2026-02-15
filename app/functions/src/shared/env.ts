export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function optionalEnv(name: string): string | null {
  return process.env[name] ?? null;
}

/**
 * Validate environment at runtime (lazy). Call from /health if desired.
 * Keep it lightweight: do NOT print secrets.
 */
export function envStatus() {
  const required = ["DATABASE_URL"];
  const optional = ["OPENAI_API_KEY", "APP_BASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"];
  return {
    required: required.map((k) => ({ key: k, present: Boolean(process.env[k]) })),
    optional: optional.map((k) => ({ key: k, present: Boolean(process.env[k]) })),
  };
}
