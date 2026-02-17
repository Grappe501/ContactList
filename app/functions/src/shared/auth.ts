import type { HandlerEvent } from "@netlify/functions";
import { jwtVerify } from "jose";
import { ApiError } from "./errors";
import { optionalEnv, requireEnv } from "./env";
import { getJwks } from "./jwks";
import { usersRepo } from "../repositories/usersRepo";

export type AuthedUser = {
  id: string;
  auth_subject: string;
  email: string;
  role: "owner" | "admin" | "organizer" | "data_entry" | "viewer";
};

function bearerToken(event: HandlerEvent): string | null {
  const h = (event.headers as any)?.authorization ?? (event.headers as any)?.Authorization ?? null;
  if (!h) return null;
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function issuer(): string {
  return requireEnv("AUTH_ISSUER").replace(/\/$/, "");
}

function audience(): string | undefined {
  const a = optionalEnv("AUTH_AUDIENCE");
  return a ? a : undefined;
}

/**
 * Require a valid JWT, map it to a local `users` row.
 * If missing, we bootstrap owner once (BOOTSTRAP_OWNER_EMAIL).
 */
export async function requireAuth(event: HandlerEvent): Promise<AuthedUser> {
  const token = bearerToken(event);
  if (!token) throw new ApiError(401, "UNAUTHORIZED", "Missing Authorization Bearer token");

  const jwks = getJwks();
  let payload: any;
  try {
    const res = await jwtVerify(token, jwks, {
      issuer: issuer(),
      audience: audience(),
    });
    payload = res.payload;
  } catch (e: any) {
    throw new ApiError(401, "UNAUTHORIZED", `Invalid token: ${e?.message ?? "verify_failed"}`);
  }

  const sub = String(payload?.sub ?? "");
  const email = String(payload?.email ?? "");
  const name = String(payload?.user_metadata?.full_name ?? payload?.user_metadata?.name ?? "");

  if (!sub) throw new ApiError(401, "UNAUTHORIZED", "Token missing sub");
  if (!email) throw new ApiError(401, "UNAUTHORIZED", "Token missing email");

  const existing = await usersRepo.findBySubject(sub);
  if (existing) {
    return {
      id: existing.id,
      auth_subject: existing.auth_subject,
      email: existing.email,
      role: existing.role,
    };
  }

  const bootstrapEmail = (optionalEnv("BOOTSTRAP_OWNER_EMAIL") ?? "").trim().toLowerCase();
  const bootDone = await usersRepo.bootstrapComplete();
  const isBootstrap = Boolean(bootstrapEmail) && email.toLowerCase() === bootstrapEmail;

  if (isBootstrap && !bootDone) {
    const created = await usersRepo.create({
      auth_subject: sub,
      email,
      display_name: name || null,
      role: "owner",
    });
    await usersRepo.setBootstrapComplete();
    return { id: created.id, auth_subject: created.auth_subject, email: created.email, role: created.role };
  }

  // Default behavior for new users:
  // Create as viewer so owner/admin can later elevate role in Overlay 14 (user management).
  const created = await usersRepo.create({
    auth_subject: sub,
    email,
    display_name: name || null,
    role: "viewer",
  });

  return { id: created.id, auth_subject: created.auth_subject, email: created.email, role: created.role };
}
