import { optionalEnv } from "../shared/env";
import { openaiJson } from "../shared/openai";
import { contactsRepo } from "../repositories/contactsRepo";
import { tagsRepo } from "../repositories/tagsRepo";
import { withDb } from "../shared/withDb";
import type { HandlerEvent } from "@netlify/functions";

type TagSuggestion = { name: string; confidence: number; reason: string };

const DEFAULT_TAG_VOCAB = [
  "Steve’s friends",
  "Kelly’s Friends",
  "Democrats contacts",
  "ballot initiative contacts",
  "Donated contacts from",
  "Arkansas",
  "College friend",
  "past business associate",
  "Alltell/Verizon",
  "donor",
  "volunteer",
];

function modelTagging(): string {
  return optionalEnv("OPENAI_MODEL_TAGGING") ?? "gpt-5.2";
}
function modelRerank(): string {
  return optionalEnv("OPENAI_MODEL_RERANK") ?? "gpt-5.2";
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export const aiService = {
  async suggestTags(event: HandlerEvent, contactId: string, tagVocab?: string[]) {
    return await withDb(event, async (db) => {
      const bundle = await contactsRepo.getBundle(contactId, db);
      if (!bundle?.contact) throw new Error("Contact not found");

      const vocab = Array.isArray(tagVocab) && tagVocab.length ? tagVocab : DEFAULT_TAG_VOCAB;

      const system = `You are a campaign contact database assistant. Suggest relevant tags for a contact.
Rules:
- You MUST only choose tag names from the provided tag vocabulary.
- Return JSON only.
- Do not suggest tags that are already assigned.`;

      const user = JSON.stringify({
        tag_vocabulary: vocab,
        contact: {
          id: bundle.contact.id,
          full_name: bundle.contact.full_name,
          emails: bundle.contact.emails,
          phones: bundle.contact.phones,
          address: { city: bundle.contact.city, state: bundle.contact.state },
          company: bundle.contact.company,
          title: bundle.contact.title,
          organization: bundle.contact.organization,
          metadata_custom_fields: bundle.contact?.metadata?.custom_fields ?? {},
          sources: (bundle.sources ?? []).map((s: any) => ({ source_type: s.source_type, source_label: s.source_label })),
          notes: (bundle.notes ?? []).slice(0, 10).map((n: any) => ({ note_type: n.note_type, body: n.body })),
          existing_tags: (bundle.tags ?? []).map((t: any) => t.name),
        },
        instructions: "Pick 0-6 tags. Provide confidence 0-1 and a one-sentence reason per tag. Avoid duplicates.",
      });

      const schema = {
        type: "object",
        additionalProperties: false,
        properties: {
          suggested: {
            type: "array",
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                confidence: { type: "number" },
                reason: { type: "string" },
              },
              required: ["name", "confidence", "reason"],
            },
          },
        },
        required: ["suggested"],
      };

      const res = await openaiJson<{ suggested: TagSuggestion[] }>({
        model: modelTagging(),
        system,
        user,
        json_schema: { name: "tag_suggestions", schema, strict: true },
        temperature: 0.2,
      });

      const existing = new Set((bundle.tags ?? []).map((t: any) => String(t.name)));
      const allowed = new Set(vocab.map((t) => String(t)));

      const suggested = (res.data?.suggested ?? [])
        .filter((s) => s && allowed.has(String(s.name)))
        .filter((s) => !existing.has(String(s.name)))
        .map((s) => ({ name: String(s.name), confidence: clamp01(Number(s.confidence)), reason: String(s.reason) }));

      return { suggested, model: res.model };
    });
  },

  async applyTags(event: HandlerEvent, contactId: string, tagNames: string[]) {
    return await withDb(event, async (db) => {
      const unique = Array.from(new Set(tagNames.map((t) => t.trim()).filter(Boolean)));
      const tagIds: string[] = [];
      for (const name of unique) {
        const t = await tagsRepo.upsert({ name }, db);
        if (t?.id) tagIds.push(t.id);
      }
      await tagsRepo.assign(contactId, { tag_ids: tagIds, assigned_by: "ai", confidence: 0.8 }, db);
      return { applied: true, created_tags: 0, assigned: tagIds.length };
    });
  },

  async searchAi(event: HandlerEvent, query: string, limit: number) {
    return await withDb(event, async (db) => {
      const candidates = await contactsRepo.searchCandidates(query, Math.min(limit * 3, 300), db);

      if (candidates.length <= limit) {
        return { query, contacts: candidates.slice(0, limit), model: null, reranked: false };
      }

      const system = `You rerank contacts for relevance to a search query. Return JSON only.
Rules:
- Prefer exact name, email, phone, org, and geography matches.
- Never invent data. Only use candidate fields.`;

      const user = JSON.stringify({
        query,
        candidates: candidates.slice(0, 200).map((c: any) => ({
          id: c.id,
          full_name: c.full_name,
          primary_email: c.primary_email,
          primary_phone: c.primary_phone,
          city: c.city,
          state: c.state,
          organization: c.organization,
          company: c.company,
          title: c.title,
        })),
        instructions: "Return an ordered list of up to 50 ids in best-first order.",
      });

      const schema = {
        type: "object",
        additionalProperties: false,
        properties: {
          ordered_ids: {
            type: "array",
            items: { type: "string" },
            maxItems: 50,
          },
        },
        required: ["ordered_ids"],
      };

      const res = await openaiJson<{ ordered_ids: string[] }>({
        model: modelRerank(),
        system,
        user,
        json_schema: { name: "rerank_contacts", schema, strict: true },
        temperature: 0.0,
      });

      const ordered = res.data?.ordered_ids ?? [];
      const byId = new Map(candidates.map((c: any) => [c.id, c]));
      const out = ordered.map((id) => byId.get(id)).filter(Boolean) as any[];

      if (out.length < limit) {
        for (const c of candidates) {
          if (out.length >= limit) break;
          if (!out.find((x) => x.id === c.id)) out.push(c);
        }
      }

      return { query, contacts: out.slice(0, limit), model: res.model, reranked: true };
    });
  },
};
