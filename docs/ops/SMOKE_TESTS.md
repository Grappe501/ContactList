# Smoke Test Checklist

Run after every deploy.

## 1) Health
- GET `/.netlify/functions/api/health` returns 200

## 2) Private link gate
- Open `/#/?k=<PRIVATE_LINK_KEY>`
- Confirm unlock succeeds and Contacts page loads.

## 3) CRUD
- Create a contact
- Edit name/phone/email
- Add a note
- Add tags
- Delete contact (if enabled)

## 4) Imports
- CSV preview + commit with 2-5 rows
- vCard preview + commit with 1-3 cards

## 5) AI (if OPENAI_API_KEY)
- AI suggest tags on a contact
- AI search query returns ordered results

## 6) Dedupe + merge
- Run detection
- Merge a known duplicate pair
- Confirm:
  - tags unioned
  - notes reassigned
  - sources preserved
  - merged contact soft-deleted (if `deleted_at` exists)

## 7) Google (if configured)
- Connect Google (OAuth consent)
- Sync Google Contacts
