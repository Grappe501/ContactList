import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { importService } from "../services/importService";

export async function csvPreview(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  const out = await importService.csvPreview(body);
  return { status: 200, body: out };
}

export async function csvCommit(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  const out = await importService.csvCommit(body);
  return { status: 200, body: out };
}

export async function vcardPreview(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  const out = await importService.vcardPreview(body);
  return { status: 200, body: out };
}

export async function vcardCommit(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  const out = await importService.vcardCommit(body);
  return { status: 200, body: out };
}

export async function listBatches(_event: HandlerEvent) {
  const out = await importService.listBatches();
  return { status: 200, body: { data: out } };
}
