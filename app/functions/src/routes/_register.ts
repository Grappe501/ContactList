import type { SimpleRouter } from "../shared/router";
import { healthRoute } from "./health";
import { listContacts, createContact, getContactBundle, updateContact, deleteContact } from "./contacts";
import { listTags, upsertTag, assignTags, removeTag } from "./tags";
import { listNotes, addNote } from "./notes";
import { csvPreview, csvCommit, vcardPreview, vcardCommit, listBatches } from "./imports";

export function registerRoutes(router: SimpleRouter) {
  router.add("GET", "/health", async () => ({ status: 200, body: await healthRoute() }));

  // Contacts
  router.add("GET", "/contacts", listContacts);
  router.add("POST", "/contacts", createContact);
  router.add("GET", "/contacts/:id", getContactBundle);
  router.add("PUT", "/contacts/:id", updateContact);
  router.add("DELETE", "/contacts/:id", deleteContact);

  // Tags
  router.add("GET", "/tags", listTags);
  router.add("POST", "/tags", upsertTag);
  router.add("POST", "/contacts/:id/tags", assignTags);
  router.add("DELETE", "/contacts/:id/tags/:tag_id", removeTag);

  // Notes
  router.add("GET", "/contacts/:id/notes", listNotes);
  router.add("POST", "/contacts/:id/notes", addNote);

  // Imports
  router.add("GET", "/imports/batches", listBatches);
  router.add("POST", "/imports/csv/preview", csvPreview);
  router.add("POST", "/imports/csv/commit", csvCommit);
  router.add("POST", "/imports/vcard/preview", vcardPreview);
  router.add("POST", "/imports/vcard/commit", vcardCommit);
}
