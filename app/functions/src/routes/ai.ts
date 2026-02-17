import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { aiService } from "../services/aiService";

export async function suggestTags(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  if (!body?.contact_id) throw new ApiError(400, "VALIDATION_ERROR", "contact_id required");
  const out = await aiService.suggestTags(event, body.contact_id, body.tag_vocab);
  return { status: 200, body: out };
}

export async function applyTags(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  if (!body?.contact_id) throw new ApiError(400, "VALIDATION_ERROR", "contact_id required");
  if (!Array.isArray(body?.tag_names) || body.tag_names.length === 0) throw new ApiError(400, "VALIDATION_ERROR", "tag_names[] required");
  const out = await aiService.applyTags(event, body.contact_id, body.tag_names);
  return { status: 200, body: out };
}

export async function searchAi(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  if (!body?.query) throw new ApiError(400, "VALIDATION_ERROR", "query required");
  const limit = typeof body.limit === "number" ? body.limit : 50;
  const out = await aiService.searchAi(event, body.query, limit);
  return { status: 200, body: out };
}
