import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { notesRepo } from "../repositories/notesRepo";
import { withDb } from "../shared/withDb";

export async function listNotes(event: HandlerEvent) {
  const id = (event as any).params?.id as string | undefined;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing contact id");
  const rows = await withDb(event, async (db) => await notesRepo.list(id, db));
  return { status: 200, body: { data: rows } };
}

export async function addNote(event: HandlerEvent) {
  const id = (event as any).params?.id as string | undefined;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing contact id");
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");

  const body = JSON.parse(event.body);
  if (!body?.body) throw new ApiError(400, "VALIDATION_ERROR", "body required");

  const u = (event as any).__user;
  const row = await withDb(event, async (db) => await notesRepo.add(id, { note_type: body.note_type, body: body.body, created_by: u?.id ?? null }, db));
  return { status: 201, body: { data: row } };
}
