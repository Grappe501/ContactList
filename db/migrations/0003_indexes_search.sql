-- 0003_indexes_search.sql
-- Adds search-oriented indexes for 25k+ contacts and fast filter joins.
BEGIN;

-- Emails array search: GIN
CREATE INDEX IF NOT EXISTS idx_contacts_emails_gin ON contacts USING gin (emails);
CREATE INDEX IF NOT EXISTS idx_contacts_phones_gin ON contacts USING gin (phones);

-- Tags join performance
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_contact ON contact_tags (tag_id, contact_id);

-- Sources filtering by source_type
CREATE INDEX IF NOT EXISTS idx_sources_type_batch ON contact_sources (source_type, import_batch_id);

-- Full-text-ish search helper: concatenate key fields
-- Approach: create generated column (optional). If Neon/Postgres version supports generated columns, use it.
-- If not, implement as expression index.
CREATE INDEX IF NOT EXISTS idx_contacts_search_expr ON contacts
  USING gin (to_tsvector('simple',
    coalesce(full_name,'') || ' ' ||
    coalesce(primary_email,'') || ' ' ||
    coalesce(primary_phone,'') || ' ' ||
    coalesce(company,'') || ' ' ||
    coalesce(city,'') || ' ' ||
    coalesce(state,'')
  ));

COMMIT;
