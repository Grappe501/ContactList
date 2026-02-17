import type { SimpleRouter } from "../shared/router";
import { healthRoute } from "./health";
import { listContacts, createContact, getContactBundle, updateContact, deleteContact } from "./contacts";
import { listTags, upsertTag, assignTags, removeTag } from "./tags";
import { listNotes, addNote } from "./notes";
import { csvPreview, csvCommit, vcardPreview, vcardCommit, listBatches } from "./imports";
import { googleStatus, googleStart, googleCallback, googleSync } from "./integrations_google";
import { suggestTags, applyTags, searchAi } from "./ai";
import { runDedupe, listSuggestions, resolveSuggestion, mergeContacts } from "./dedupe";
import { listUsers, setUserRole, setUserStatus } from "./users";

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

  // Integrations — Google
  router.add("GET", "/integrations/google/status", googleStatus);
  router.add("GET", "/integrations/google/start", googleStart);
  router.add("GET", "/integrations/google/callback", googleCallback);
  router.add("POST", "/integrations/google/sync", googleSync);

  // AI
  router.add("POST", "/ai/tags/suggest", suggestTags);
  router.add("POST", "/ai/tags/apply", applyTags);
  router.add("POST", "/ai/contacts/search_ai", searchAi);

  // De-dupe + Merge
  router.add("POST", "/dedupe/run", runDedupe);
  router.add("GET", "/dedupe/suggestions", listSuggestions);
  router.add("POST", "/dedupe/suggestions/:id/resolve", resolveSuggestion);
  router.add("POST", "/dedupe/merge", mergeContacts);

  // Users admin
  router.add("GET", "/users", listUsers);
  router.add("PUT", "/users/:id/role", setUserRole);
  router.add("PUT", "/users/:id/status", setUserStatus);
}
