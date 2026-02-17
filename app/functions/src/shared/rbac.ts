// app/functions/src/shared/rbac.ts
import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "./errors";
import { requireAuth, type AuthedUser } from "./auth";

/**
 * ContactListSOS RBAC (single-tenant)
 *
 * We keep a simple 3-role model:
 *   - admin  : full access
 *   - editor : write access (create/update), limited admin actions
 *   - viewer : read-only
 *
 * Back-compat:
 * Your auth bootstrap/user table may still contain legacy roles:
 *   owner/admin/organizer/data_entry/viewer
 * We normalize them into admin/editor/viewer at runtime.
 */

export type Role = "admin" | "editor" | "viewer";

export type AuthedContext = {
  user: AuthedUser & { role: Role };
};

function normalizeRole(r: AuthedUser["role"]): Role {
  // Legacy → new mapping
  if (r === "owner" || r === "admin") return "admin";
  if (r === "organizer" || r === "data_entry") return "editor";
  return "viewer";
}

function rank(role: Role): number {
  switch (role) {
    case "viewer":
      return 1;
    case "editor":
      return 2;
    case "admin":
      return 3;
  }
}

export async function requireUser(event: HandlerEvent): Promise<AuthedUser & { role: Role }> {
  const u = await requireAuth(event);
  return { ...u, role: normalizeRole(u.role) };
}

export function assertMinRole(user: { role: Role }, minRole: Role) {
  if (rank(user.role) < rank(minRole)) {
    throw new ApiError(403, "FORBIDDEN", `Requires ${minRole} role`);
  }
}

/**
 * Convenience guards
 */
export async function requireViewer(event: HandlerEvent) {
  const user = await requireUser(event);
  assertMinRole(user, "viewer");
  return user;
}

export async function requireEditor(event: HandlerEvent) {
  const user = await requireUser(event);
  assertMinRole(user, "editor");
  return user;
}

export async function requireAdmin(event: HandlerEvent) {
  const user = await requireUser(event);
  assertMinRole(user, "admin");
  return user;
}

/**
 * Wrap a handler and inject `ctx.user`.
 *
 * Usage:
 *   export const handler = withRole("viewer", async (event, ctx) => { ... });
 */
export function withRole<T>(
  minRole: Role,
  fn: (event: HandlerEvent, ctx: AuthedContext) => Promise<T>
) {
  return async (event: HandlerEvent) => {
    const user = await requireUser(event);
    assertMinRole(user, minRole);
    return await fn(event, { user });
  };
}

/**
 * Helper for REST-y permission checks (optional)
 */
export function requiredRoleForMethod(method: string): Role {
  const m = (method || "GET").toUpperCase();
  // Read-only
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return "viewer";
  // Writes
  if (m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE") return "editor";
  // Default to viewer
  return "viewer";
}

/**
 * If you want "method-based RBAC" quickly:
 *   const minRole = requiredRoleForMethod(event.httpMethod);
 *   const user = await requireUser(event); assertMinRole(user, minRole);
 */
