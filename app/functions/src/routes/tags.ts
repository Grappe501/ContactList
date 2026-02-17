import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { tagsRepo } from "../repositories/tagsRepo";
import { withDb } from "../shared/withDb";

export async function listTags(event: HandlerEvent) {
  const rows = await withDb(event, async (db) => await tagsRepo.list(db));
  return { status: 200, body: { data: rows } };
}

export async function upsertTag(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  if (!body?.name) throw new ApiError(400, "VALIDATION_ERROR", "name required");

  const row = await withDb(event, async (db) => await tagsRepo.upsert({ name: body.name }, db));
  return { status: 201, body: { data: row } };
}

export async function assignTags(event: HandlerEvent) {
  const id = (event as any).params?.id as string | undefined;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing contact id");
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);
  const tag_ids = body?.tag_ids ?? [];
  if (!Array.isArray(tag_ids)) throw new ApiError(400, "VALIDATION_ERROR", "tag_ids must be array");

  const out = await withDb(event, async (db) => await tagsRepo.assign(id, { tag_ids, assigned_by: "user", confidence: 1.0 }, db));
  return { status: 200, body: out };
}

export async function removeTag(event: HandlerEvent) {
  const id = (event as any).params?.id as string | undefined;
  const tag_id = (event as any).params?.tag_id as string | undefined;
  if (!id || !tag_id) throw new ApiError(400, "VALIDATION_ERROR", "Missing ids");

  await withDb(event, async (db) => {
    await db.query(`DELETE FROM contact_tags WHERE contact_id=$1 AND tag_id=$2`, [id, tag_id]);
    return true;
  });

  return { status: 200, body: { removed: true } };
}
