-- Migration: 0001_create_ehs_events.sql
-- Description: Create EHS event sourcing table and materialized view
-- Date: 2026-06-22

-- Create ehs_events table (append-only event store)
CREATE TABLE IF NOT EXISTS ehs_events (
  event_id UUID PRIMARY KEY,
  sequence BIGSERIAL NOT NULL,
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ehs_events_sequence ON ehs_events(sequence);
CREATE INDEX IF NOT EXISTS idx_ehs_events_created_at ON ehs_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ehs_events_tenant_id ON ehs_events(tenant_id);

-- Materialized view for incident snapshots (query optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS ehs_incident_snapshots AS
SELECT
  (payload->>'reporterId')::UUID as reporter_id,
  payload->>'incidentType' as incident_type,
  payload->>'locationId' as location_id,
  (payload->>'timestamp')::TIMESTAMPTZ as incident_timestamp,
  payload->>'photoS3Key' as photo_s3_key,
  payload->>'description' as description,
  created_at,
  tenant_id,
  event_id
FROM ehs_events
WHERE type = 'INCIDENT_REPORTED';

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_ehs_snapshots_tenant ON ehs_incident_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ehs_snapshots_incident_ts ON ehs_incident_snapshots(incident_timestamp DESC);

-- Refresh trigger (optional - можно заменить на cron job)
-- Uncomment if you want automatic refresh on INSERT:
-- CREATE OR REPLACE FUNCTION refresh_ehs_snapshots() RETURNS TRIGGER AS $$
-- BEGIN
--   REFRESH MATERIALIZED VIEW CONCURRENTLY ehs_incident_snapshots;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER ehs_events_refresh_snapshots
-- AFTER INSERT ON ehs_events
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION refresh_ehs_snapshots();

-- Comments
COMMENT ON TABLE ehs_events IS 'Event sourcing table for EHS (Environment, Health, Safety) incidents';
COMMENT ON COLUMN ehs_events.event_id IS 'Client-generated UUID for idempotency';
COMMENT ON COLUMN ehs_events.sequence IS 'Auto-incrementing sequence number';
COMMENT ON COLUMN ehs_events.payload IS 'Event payload as JSONB';
COMMENT ON MATERIALIZED VIEW ehs_incident_snapshots IS 'Materialized view for incident reporting queries';
