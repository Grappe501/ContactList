import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { requireAdminOrOwner, requireOwner } from "../shared/rbac";
import { usersAdminRepo } from "../repositories/usersAdminRepo";

type Role = "owner" | "admin" | "organizer" | "data_entry" | "viewer";

export async function listUsers(event: HandlerEvent) {
  requireAdminOrOwner(event);
  const sp = new URLSearchParams(event.rawQuery ?? "");
  const limit = Math.min(500, Math.max(1, Number(sp.get("limit") ?? "200")));
  const data = await usersAdminRepo.list(limit);
  return { status: 200, body: { data } };
}

export async function setUserRole(event: HandlerEvent) {
  const actor = requireAdminOrOwner(event);

  const id = (event as any).params?.id as string | undefined;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing user id");
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");

  const body = JSON.parse(event.body);
  const role = body?.role as Role | undefined;
  if (!role || !["owner","admin","organizer","data_entry","viewer"].includes(role)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid role");
  }

  // Only owner can set someone to owner or demote an owner.
  const target = await usersAdminRepo.get(id);
  if (!target) throw new ApiError(404, "NOT_FOUND", "User not found");

  const targetIsOwner = target.role === "owner";
  const promotingToOwner = role === "owner";

  if ((targetIsOwner || promotingToOwner) && actor.role !== "owner") {
    throw new ApiError(403, "FORBIDDEN", "Only owner can change owner role");
  }

  // Prevent removing the last active owner
  if (targetIsOwner && role !== "owner") {
    const owners = await usersAdminRepo.countOwners();
    if (owners <= 1) throw new ApiError(409, "CONFLICT", "Cannot demote the last active owner");
  }

  const row = await usersAdminRepo.setRole(id, role);
  return { status: 200, body: { updated: true, user: row } };
}

export async function setUserStatus(event: HandlerEvent) {
  const actor = requireAdminOrOwner(event);

  const id = (event as any).params?.id as string | undefined;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing user id");
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");

  const body = JSON.parse(event.body);
  const status = String(body?.status ?? "");
  if (!["active","disabled"].includes(status)) throw new ApiError(400, "VALIDATION_ERROR", "status must be active|disabled");

  const target = await usersAdminRepo.get(id);
  if (!target) throw new ApiError(404, "NOT_FOUND", "User not found");

  if (target.role === "owner" && status !== "active" && actor.role !== "owner") {
    throw new ApiError(403, "FORBIDDEN", "Only owner can disable an owner");
  }

  if (target.role === "owner" && status !== "active") {
    const owners = await usersAdminRepo.countOwners();
    if (owners <= 1) throw new ApiError(409, "CONFLICT", "Cannot disable the last active owner");
  }

  const row = await usersAdminRepo.setStatus(id, status);
  return { status: 200, body: { updated: true, user: row } };
}
