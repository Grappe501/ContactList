import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { tagsService } from "../services/tagsService";

export async function listTags(_event: HandlerEvent) {
  const data = await tagsService.list();
  return { status: 200, body: { data } };
}

export async function upsertTag(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  if (!body?.name || typeof body.name !== "string") {
    throw new ApiError(400, "VALIDATION_ERROR", "Tag name is required");
  }
  const tag = await tagsService.upsert(body);
  return { status: 200, body: tag };
}

export async function assignTags(event: HandlerEvent, params: Record<string, string>) {
  const contactId = params.id;
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  if (!Array.isArray(body.tag_ids) || body.tag_ids.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "tag_ids[] is required");
  }
  await tagsService.assign(contactId, body);
  return { status: 200, body: { assigned: true } };
}

export async function removeTag(_event: HandlerEvent, params: Record<string, string>) {
  const contactId = params.id;
  const tagId = params.tag_id;
  const ok = await tagsService.remove(contactId, tagId);
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Tag assignment not found");
  return { status: 200, body: { removed: true } };
}
