import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { notesService } from "../services/notesService";

export async function listNotes(_event: HandlerEvent, params: Record<string, string>) {
  const contactId = params.id;
  const data = await notesService.list(contactId);
  return { status: 200, body: { data } };
}

export async function addNote(event: HandlerEvent, params: Record<string, string>) {
  const contactId = params.id;
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  if (!body?.note_type || !body?.body) {
    throw new ApiError(400, "VALIDATION_ERROR", "note_type and body are required");
  }
  const created = await notesService.create(contactId, body);
  return { status: 201, body: created };
}
