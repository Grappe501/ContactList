-- 0004_optional_pg_trgm.sql
-- Optional fuzzy-search acceleration (requires pg_trgm extension).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fuzzy name search
CREATE INDEX IF NOT EXISTS idx_contacts_full_name_trgm ON contacts USING gin (full_name gin_trgm_ops);

COMMIT;
