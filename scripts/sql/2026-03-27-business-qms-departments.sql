-- Business QMS: departments, destinations, timelines, counter.department_id, ticket routing cols

DO $$ BEGIN
  CREATE TYPE department_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE destination_type AS ENUM ('department', 'counter', 'external');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE ticket_event_type ADD VALUE IF NOT EXISTS 'redirected';

CREATE TABLE IF NOT EXISTS department (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status department_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS department_site_code_uidx ON department(site_id, code);
CREATE INDEX IF NOT EXISTS department_business_idx ON department(business_id);
CREATE INDEX IF NOT EXISTS department_site_idx ON department(site_id);

CREATE TABLE IF NOT EXISTS destination (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  name text NOT NULL,
  type destination_type NOT NULL,
  target_department_id uuid REFERENCES department(id) ON DELETE SET NULL,
  target_counter_id uuid,
  external_label text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS destination_business_idx ON destination(business_id);

ALTER TABLE counter ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES department(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS counter_department_idx ON counter(department_id);

ALTER TABLE destination
  DROP CONSTRAINT IF EXISTS destination_target_counter_id_fkey;
ALTER TABLE destination
  ADD CONSTRAINT destination_target_counter_id_fkey
  FOREIGN KEY (target_counter_id) REFERENCES counter(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS service_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_timeline_business_idx ON service_timeline(business_id);
CREATE INDEX IF NOT EXISTS service_timeline_service_idx ON service_timeline(service_id);

CREATE TABLE IF NOT EXISTS service_timeline_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES service_timeline(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  destination_id uuid NOT NULL REFERENCES destination(id) ON DELETE RESTRICT,
  sla_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS service_timeline_step_order_uidx ON service_timeline_step(timeline_id, step_order);
CREATE INDEX IF NOT EXISTS service_timeline_step_timeline_idx ON service_timeline_step(timeline_id);

ALTER TABLE ticket ADD COLUMN IF NOT EXISTS destination_id uuid REFERENCES destination(id) ON DELETE SET NULL;
ALTER TABLE ticket ADD COLUMN IF NOT EXISTS timeline_step_id uuid REFERENCES service_timeline_step(id) ON DELETE SET NULL;

-- Backfill: one General department per site; attach counters; destination per counter
INSERT INTO department (business_id, site_id, name, code, sort_order, status)
SELECT s.business_id, s.id, 'General', 'GEN', 0, 'active'
FROM site s
WHERE NOT EXISTS (
  SELECT 1 FROM department d WHERE d.site_id = s.id AND d.code = 'GEN'
);

UPDATE counter c
SET department_id = d.id
FROM department d
WHERE d.site_id = c.site_id AND d.code = 'GEN' AND c.department_id IS NULL;

INSERT INTO destination (business_id, name, type, target_counter_id, active)
SELECT c.business_id, c.label, 'counter', c.id, true
FROM counter c
WHERE NOT EXISTS (
  SELECT 1 FROM destination dest WHERE dest.target_counter_id = c.id
);

INSERT INTO destination (business_id, name, type, target_department_id, active)
SELECT d.business_id, d.name, 'department', d.id, true
FROM department d
WHERE NOT EXISTS (
  SELECT 1 FROM destination dest WHERE dest.target_department_id = d.id AND dest.type = 'department'
);
