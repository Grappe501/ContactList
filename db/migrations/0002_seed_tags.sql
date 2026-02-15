-- 0002_seed_tags.sql
BEGIN;

INSERT INTO tags (name, category, description)
VALUES
  ('Steve’s friends', 'relationship', 'Contacts known primarily through Steve'),
  ('Kelly’s Friends', 'relationship', 'Contacts known primarily through Kelly'),
  ('Democrats contacts', 'political', 'Democratic-aligned contacts'),
  ('ballot initiative contacts', 'political', 'Contacts related to ballot initiative efforts'),
  ('Arkansas', 'geo', 'Arkansas-based contacts'),
  ('College friend', 'relationship', 'Contacts from college'),
  ('past business associate', 'work', 'Former business relationships'),
  ('Alltell/Verizon', 'work', 'Contacts from Alltel/Verizon networks'),
  ('donor', 'campaign', 'Donor contact'),
  ('volunteer', 'campaign', 'Volunteer contact')
ON CONFLICT (name) DO NOTHING;

COMMIT;
