import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "./errors";

type Role = "owner" | "admin" | "organizer" | "data_entry" | "viewer";

export function currentUser(event: HandlerEvent): { id: string; role: Role; email: string } {
  const u = (event as any).__user;
  if (!u) throw new ApiError(401, "UNAUTHORIZED", "Missing auth context");
  return u;
}

export function requireRole(event: HandlerEvent, allowed: Role[]) {
  const u = currentUser(event);
  if (!allowed.includes(u.role)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient permissions");
  }
  return u;
}

export function requireOwner(event: HandlerEvent) {
  return requireRole(event, ["owner"]);
}

export function requireAdminOrOwner(event: HandlerEvent) {
  return requireRole(event, ["owner", "admin"]);
}
