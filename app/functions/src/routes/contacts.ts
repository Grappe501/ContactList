import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../shared/errors";
import { contactsRepo } from "../repositories/contactsRepo";
import { withDb } from "../shared/withDb";

export async function listContacts(event: HandlerEvent) {
  const sp = new URLSearchParams(event.rawQuery ?? "");
  const params: any = Object.fromEntries(sp.entries());

  const rows = await withDb(event, async (db) => {
    return await contactsRepo.list(params, db);
  });

  return { status: 200, body: { data: rows } };
}

export async function createContact(event: HandlerEvent) {
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);

  const out = await withDb(event, async (db) => {
    const res = await db.query(
      `
      INSERT INTO contacts (full_name, first_name, last_name, primary_email, primary_phone, emails, phones, city, state, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        body.full_name ?? null,
        body.first_name ?? null,
        body.last_name ?? null,
        body.primary_email ?? null,
        body.primary_phone ?? null,
        body.emails ?? [],
        body.phones ?? [],
        body.city ?? null,
        body.state ?? null,
        body.metadata ?? {},
      ]
    );
    return res.rows[0];
  });

  return { status: 201, body: { data: out } };
}

export async function getContactBundle(event: HandlerEvent) {
  const id = (event as any).params?.id as string | undefined;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing contact id");

  const bundle = await withDb(event, async (db) => {
    return await contactsRepo.getBundle(id, db);
  });

  if (!bundle) throw new ApiError(404, "NOT_FOUND", "Contact not found");
  return { status: 200, body: bundle };
}

export async function updateContact(event: HandlerEvent) {
  const id = (event as any).params?.id as string | undefined;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing contact id");
  if (!event.body) throw new ApiError(400, "VALIDATION_ERROR", "Missing request body");
  const body = JSON.parse(event.body);

  const out = await withDb(event, async (db) => {
    const res = await db.query(
      `
      UPDATE contacts SET
        full_name=COALESCE($2, full_name),
        first_name=COALESCE($3, first_name),
        last_name=COALESCE($4, last_name),
        primary_email=COALESCE($5, primary_email),
        primary_phone=COALESCE($6, primary_phone),
        emails=COALESCE($7, emails),
        phones=COALESCE($8, phones),
        city=COALESCE($9, city),
        state=COALESCE($10, state),
        metadata=COALESCE($11, metadata),
        updated_at=now()
      WHERE id=$1
      RETURNING *
      `,
      [id, body.full_name ?? null, body.first_name ?? null, body.last_name ?? null, body.primary_email ?? null, body.primary_phone ?? null,
       body.emails ?? null, body.phones ?? null, body.city ?? null, body.state ?? null, body.metadata ?? null]
    );
    return res.rows[0];
  });

  return { status: 200, body: { data: out } };
}

export async function deleteContact(event: HandlerEvent) {
  const id = (event as any).params?.id as string | undefined;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing contact id");

  await withDb(event, async (db) => {
    await db.query(`DELETE FROM contacts WHERE id=$1`, [id]);
    return true;
  });

  return { status: 200, body: { deleted: true } };
}
