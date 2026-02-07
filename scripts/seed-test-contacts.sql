-- Seed test contacts for Phase 2 testing
-- Run this with: psql $DATABASE_URL -f scripts/seed-test-contacts.sql

-- Insert test contacts with proper UUIDs
INSERT INTO contacts (org_id, first_name, last_name, email, phone, metadata, tags)
VALUES
  ('org_test', 'John', 'Doe', 'john.doe@example.com', '555-0100', '{}', '{}'),
  ('org_test', 'Jane', 'Smith', 'jane.smith@example.com', '555-0101', '{}', '{}'),
  ('org_test', 'Robert', 'Johnson', 'robert.johnson@example.com', '555-0102', '{}', '{}'),
  ('org_test', 'Maria', 'Garcia', 'maria.garcia@example.com', '555-0103', '{}', '{}'),
  ('org_test', 'Michael', 'Brown', 'michael.brown@example.com', '555-0104', '{}', '{}')
ON CONFLICT DO NOTHING;

-- Display the created contacts
SELECT id, first_name, last_name, email FROM contacts WHERE org_id = 'org_test';
