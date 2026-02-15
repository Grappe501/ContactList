import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { validateBody } from "../shared/validate";
import { contactsService } from "../services/contactsService";

function parseIntOrDefault(v: string | null, d: number): number {
  if (!v) return d;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

function getQuery(event: HandlerEvent): URLSearchParams {
  // event.rawQuery exists in Netlify, but to be safe we parse from event.path
  const q = event.rawQuery ?? "";
  return new URLSearchParams(q);
}

export async function listContacts(event: HandlerEvent) {
  const sp = getQuery(event);

  const params = {
    q: sp.get("q"),
    tag: sp.get("tag"),
    source_type: sp.get("source_type"),
    state: sp.get("state"),
    sort: sp.get("sort") ?? "name",
    order: sp.get("order") ?? "asc",
    page: parseIntOrDefault(sp.get("page"), 1),
    page_size: Math.min(parseIntOrDefault(sp.get("page_size"), 25), 200),
  };

  const result = await contactsService.list(params);
  return { status: 200, body: result };
}

export async function createContact(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  const dto = validateBody<any>("ContactCreate", body);
  const created = await contactsService.create(dto);
  return { status: 201, body: created };
}

export async function getContactBundle(event: HandlerEvent, params: Record<string, string>) {
  const id = params.id;
  const bundle = await contactsService.getBundle(id);
  if (!bundle) throw new ApiError(404, "NOT_FOUND", "Contact not found");
  return { status: 200, body: bundle };
}

export async function updateContact(event: HandlerEvent, params: Record<string, string>) {
  const id = params.id;
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  const patch = validateBody<any>("ContactPatch", body);
  const updated = await contactsService.update(id, patch);
  if (!updated) throw new ApiError(404, "NOT_FOUND", "Contact not found");
  return { status: 200, body: updated };
}

export async function deleteContact(_event: HandlerEvent, params: Record<string, string>) {
  const id = params.id;
  const ok = await contactsService.remove(id);
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Contact not found");
  return { status: 200, body: { deleted: true } };
}
