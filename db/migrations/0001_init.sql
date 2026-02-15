-- 0001_init.sql
-- ContactList initial schema (Postgres)
-- Requires: pgcrypto

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  first_name text NULL,
  middle_name text NULL,
  last_name text NULL,
  suffix text NULL,
  primary_email text NULL,
  primary_phone text NULL,
  emails text[] NOT NULL DEFAULT '{}'::text[],
  phones text[] NOT NULL DEFAULT '{}'::text[],
  street text NULL,
  street2 text NULL,
  city text NULL,
  state text NULL,
  postal_code text NULL,
  country text NOT NULL DEFAULT 'USA',
  company text NULL,
  title text NULL,
  organization text NULL,
  website text NULL,
  birthday date NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_email_lower ON contacts (lower(primary_email));
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts (primary_phone);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_contacts_city_state ON contacts (city, state);

CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('google','csv','vcard','donated','manual')),
  source_label text NOT NULL,
  file_name text NULL,
  donor_name text NULL,
  donor_org text NULL,
  operator_label text NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  record_count int NOT NULL DEFAULT 0,
  processed_count int NOT NULL DEFAULT 0,
  error_summary text NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_batches_status_created ON import_batches (status, created_at DESC);

CREATE TABLE IF NOT EXISTS contact_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  import_batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('google','csv','vcard','donated','manual')),
  source_label text NOT NULL,
  external_id text NULL,
  row_fingerprint text NOT NULL,
  raw_payload jsonb NOT NULL,
  normalized_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sources_batch_fingerprint UNIQUE (import_batch_id, row_fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_sources_contact ON contact_sources (contact_id);
CREATE INDEX IF NOT EXISTS idx_sources_batch ON contact_sources (import_batch_id);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by text NOT NULL DEFAULT 'manual' CHECK (assigned_by IN ('manual','ai','system')),
  confidence numeric NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  import_batch_id uuid NULL REFERENCES import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON contact_tags (contact_id);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  import_batch_id uuid NULL REFERENCES import_batches(id) ON DELETE SET NULL,
  note_type text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_contact_created ON notes (contact_id, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  actor_label text NULL,
  actor_fingerprint text NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  import_batch_id uuid NULL REFERENCES import_batches(id) ON DELETE SET NULL,
  before_state jsonb NULL,
  after_state jsonb NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log (entity_type, entity_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_batch ON activity_log (import_batch_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS duplicate_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id_a uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_id_b uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 1),
  reasons jsonb NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','merged')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_dupe_pair UNIQUE (contact_id_a, contact_id_b)
);
CREATE INDEX IF NOT EXISTS idx_dupes_status_score ON duplicate_suggestions (status, score DESC);

CREATE TABLE IF NOT EXISTS merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survivor_contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  merged_contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  field_decisions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_label text NULL
);
CREATE INDEX IF NOT EXISTS idx_merges_survivor ON merges (survivor_contact_id, created_at DESC);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'google',
  account_email text NULL,
  encrypted_refresh_token text NOT NULL,
  encrypted_access_token text NULL,
  access_token_expires_at timestamptz NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON contacts;
CREATE TRIGGER trg_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
