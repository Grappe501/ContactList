# Overlay 05 — Tags + Notes Modules
Generated: 2026-02-13T00:30:33.960681

Purpose:
- Implement Tag CRUD (list + upsert) and Contact Tag assignment/removal.
- Implement Notes (list + create) for a Contact.
- Wire UI on Contact Detail to show TagsPicker and NotesTimeline minimally (Phase-1 UI wiring).
- Add route registrations to API router.

Endpoints implemented:
- GET    /tags
- POST   /tags
- POST   /contacts/:id/tags
- DELETE /contacts/:id/tags/:tag_id
- GET    /contacts/:id/notes
- POST   /contacts/:id/notes

Apply:
1) Unzip into ContactList root.
2) `cd app\functions; npm ci; npm run build`
3) `cd ..\web; npm ci; npm run build`

Smoke tests:
- GET `/.netlify/functions/api/tags`
- POST `/.netlify/functions/api/tags` { "name":"volunteer", "category":"campaign" }
- POST `/.netlify/functions/api/contacts/<id>/tags` { "tag_ids":["<taguuid>"] }
- POST `/.netlify/functions/api/contacts/<id>/notes` { "note_type":"general", "body":"met at event" }
