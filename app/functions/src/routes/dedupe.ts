import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { dedupeService } from "../services/dedupeService";

export async function runDedupe(event: HandlerEvent) {
  const body = event.body ? JSON.parse(event.body) : {};
  const limit = typeof body.limit === "number" ? body.limit : 500;
  const out = await dedupeService.run({ limit });
  return { status: 200, body: out };
}

export async function listSuggestions(event: HandlerEvent) {
  const sp = new URLSearchParams(event.rawQuery ?? "");
  const status = sp.get("status") ?? "open";
  const limit = Number(sp.get("limit") ?? "200");
  const out = await dedupeService.list({ status, limit: Math.min(500, Math.max(1, limit)) });
  return { status: 200, body: { data: out } };
}

export async function resolveSuggestion(event: HandlerEvent) {
  const id = (event as any).params?.id as string | undefined;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing suggestion id");
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  const resolution = body?.resolution;
  if (!["accepted", "rejected"].includes(resolution)) throw new ApiError(400, "VALIDATION_ERROR", "resolution must be accepted|rejected");
  const out = await dedupeService.resolve(id, resolution);
  return { status: 200, body: out };
}

export async function mergeContacts(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  const survivor_contact_id = body?.survivor_contact_id;
  const merged_contact_id = body?.merged_contact_id;
  if (!survivor_contact_id || !merged_contact_id) throw new ApiError(400, "VALIDATION_ERROR", "survivor_contact_id and merged_contact_id required");
  const suggestion_id = body?.suggestion_id ?? null;
  const out = await dedupeService.merge({ survivor_contact_id, merged_contact_id, suggestion_id, merged_by: body?.merged_by ?? "dashboard" });
  return { status: 200, body: out };
}
