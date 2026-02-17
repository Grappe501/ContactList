import { createRemoteJWKSet } from "jose";
import { requireEnv } from "./env";

// Cache the remote JWK Set across invocations (best-effort in serverless)
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export function getJwks() {
  if (jwks) return jwks;
  const url = new URL(requireEnv("AUTH_JWKS_URL"));
  jwks = createRemoteJWKSet(url);
  return jwks;
}
