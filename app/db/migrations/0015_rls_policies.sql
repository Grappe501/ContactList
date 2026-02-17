-- 0015_rls_policies.sql
-- Enable RLS and define policies based on app.role/app.user_id session settings.
-- Idempotent as much as possible.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helpers to read settings safely
CREATE OR REPLACE FUNCTION app_role() RETURNS text AS $$
  SELECT COALESCE(current_setting('app.role', true), 'anonymous');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Convenience predicates
CREATE OR REPLACE FUNCTION role_in(roles text[]) RETURNS boolean AS $$
  SELECT app_role() = ANY(roles);
$$ LANGUAGE sql STABLE;

-- ========== CONTACTS ==========
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS contacts_read ON contacts';
  EXECUTE 'DROP POLICY IF EXISTS contacts_write ON contacts';
  EXECUTE 'DROP POLICY IF EXISTS contacts_delete ON contacts';
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

CREATE POLICY contacts_read
ON contacts FOR SELECT
USING (role_in(ARRAY['owner','admin','organizer','data_entry','viewer']));

CREATE POLICY contacts_write
ON contacts FOR INSERT, UPDATE
USING (role_in(ARRAY['owner','admin','organizer','data_entry']))
WITH CHECK (role_in(ARRAY['owner','admin','organizer','data_entry']));

CREATE POLICY contacts_delete
ON contacts FOR DELETE
USING (role_in(ARRAY['owner','admin']));

-- ========== NOTES ==========
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS notes_read ON notes';
  EXECUTE 'DROP POLICY IF EXISTS notes_write ON notes';
  EXECUTE 'DROP POLICY IF EXISTS notes_delete ON notes';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY notes_read
ON notes FOR SELECT
USING (role_in(ARRAY['owner','admin','organizer','data_entry','viewer']));

CREATE POLICY notes_write
ON notes FOR INSERT, UPDATE
USING (role_in(ARRAY['owner','admin','organizer','data_entry']))
WITH CHECK (role_in(ARRAY['owner','admin','organizer','data_entry']));

CREATE POLICY notes_delete
ON notes FOR DELETE
USING (role_in(ARRAY['owner','admin']));

-- ========== TAGS ==========
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS tags_read ON tags';
  EXECUTE 'DROP POLICY IF EXISTS tags_write ON tags';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY tags_read
ON tags FOR SELECT
USING (role_in(ARRAY['owner','admin','organizer','data_entry','viewer']));

CREATE POLICY tags_write
ON tags FOR INSERT, UPDATE, DELETE
USING (role_in(ARRAY['owner','admin','organizer','data_entry']))
WITH CHECK (role_in(ARRAY['owner','admin','organizer','data_entry']));

-- ========== CONTACT_TAGS (junction) ==========
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS contact_tags_rw ON contact_tags';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY contact_tags_rw
ON contact_tags FOR SELECT, INSERT, UPDATE, DELETE
USING (role_in(ARRAY['owner','admin','organizer','data_entry','viewer']))
WITH CHECK (role_in(ARRAY['owner','admin','organizer','data_entry']));

-- ========== CONTACT_SOURCES (provenance) ==========
ALTER TABLE contact_sources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS contact_sources_rw ON contact_sources';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY contact_sources_rw
ON contact_sources FOR SELECT, INSERT, UPDATE, DELETE
USING (role_in(ARRAY['owner','admin','organizer','data_entry','viewer']))
WITH CHECK (role_in(ARRAY['owner','admin','organizer','data_entry']));

-- ========== IMPORT_BATCHES ==========
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS import_batches_rw ON import_batches';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY import_batches_rw
ON import_batches FOR SELECT, INSERT, UPDATE, DELETE
USING (role_in(ARRAY['owner','admin','organizer','data_entry','viewer']))
WITH CHECK (role_in(ARRAY['owner','admin','organizer','data_entry']));

-- ========== DUPLICATE_SUGGESTIONS ==========
ALTER TABLE duplicate_suggestions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS duplicate_suggestions_rw ON duplicate_suggestions';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY duplicate_suggestions_rw
ON duplicate_suggestions FOR SELECT, INSERT, UPDATE, DELETE
USING (role_in(ARRAY['owner','admin','organizer','viewer']))
WITH CHECK (role_in(ARRAY['owner','admin','organizer']));

-- ========== MERGE_HISTORY ==========
ALTER TABLE merge_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS merge_history_read ON merge_history';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY merge_history_read
ON merge_history FOR SELECT
USING (role_in(ARRAY['owner','admin','organizer','viewer','data_entry']));

-- ========== OAUTH TOKENS (if exists) ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='oauth_tokens') THEN
    EXECUTE 'ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS oauth_tokens_rw ON oauth_tokens';
    EXECUTE $$POLICY$
      CREATE POLICY oauth_tokens_rw
      ON oauth_tokens FOR SELECT, INSERT, UPDATE, DELETE
      USING (role_in(ARRAY['owner','admin']))
      WITH CHECK (role_in(ARRAY['owner','admin']))
    $POLICY$;
  END IF;
END $$;
