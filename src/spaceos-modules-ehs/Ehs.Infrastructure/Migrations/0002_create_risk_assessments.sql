-- Migration: 0002_create_risk_assessments.sql
-- Description: Create risk_assessments table with RLS policies (v3-C1 security fix)
-- Date: 2026-06-23
-- Security: Addresses RLS policy bypass vulnerability

-- Create risk_assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  assessment_id INTEGER NOT NULL,
  likelihood_before INTEGER NOT NULL CHECK (likelihood_before BETWEEN 1 AND 5),
  severity_before INTEGER NOT NULL CHECK (severity_before BETWEEN 1 AND 5),
  likelihood_after INTEGER NOT NULL CHECK (likelihood_after BETWEEN 1 AND 5),
  severity_after INTEGER NOT NULL CHECK (severity_after BETWEEN 1 AND 5),
  category VARCHAR(100) NOT NULL,
  notes VARCHAR(2000) NOT NULL,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_hash VARCHAR(64) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_assessments_org_id ON risk_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_at ON risk_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_data_hash ON risk_assessments(data_hash);

-- Unique constraint on data_hash to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_assessments_data_hash_unique ON risk_assessments(data_hash);

-- ==============================================
-- RLS (Row-Level Security) Policies - v3-C1 FIX
-- ==============================================
-- Prevents tenant isolation bypass by ensuring users can only access their organization's data

-- Enable RLS on the table
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Users can only read their own organization's assessments
CREATE POLICY risk_assessments_select_policy ON risk_assessments
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policy 2: INSERT - Users can only insert assessments for their own organization
CREATE POLICY risk_assessments_insert_policy ON risk_assessments
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policy 3: UPDATE - Users can only update their own organization's assessments
CREATE POLICY risk_assessments_update_policy ON risk_assessments
  FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policy 4: DELETE - Users can only delete their own organization's assessments
CREATE POLICY risk_assessments_delete_policy ON risk_assessments
  FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Comments
COMMENT ON TABLE risk_assessments IS 'Risk assessment records with likelihood, severity, and mitigation tracking';
COMMENT ON COLUMN risk_assessments.id IS 'Primary key UUID';
COMMENT ON COLUMN risk_assessments.organization_id IS 'Organization/tenant ID for multi-tenancy (used by RLS)';
COMMENT ON COLUMN risk_assessments.assessment_id IS 'Business identifier for the assessment';
COMMENT ON COLUMN risk_assessments.likelihood_before IS 'Likelihood rating before mitigation (1-5)';
COMMENT ON COLUMN risk_assessments.severity_before IS 'Severity rating before mitigation (1-5)';
COMMENT ON COLUMN risk_assessments.likelihood_after IS 'Likelihood rating after mitigation (1-5)';
COMMENT ON COLUMN risk_assessments.severity_after IS 'Severity rating after mitigation (1-5)';
COMMENT ON COLUMN risk_assessments.category IS 'Risk category (e.g., "Fire Safety", "Chemical Hazard")';
COMMENT ON COLUMN risk_assessments.notes IS 'Mitigation measures and notes (required for high-risk assessments)';
COMMENT ON COLUMN risk_assessments.created_by IS 'User who created the assessment';
COMMENT ON COLUMN risk_assessments.created_at IS 'Timestamp when assessment was created';
COMMENT ON COLUMN risk_assessments.data_hash IS 'SHA256 hash of assessment data for immutability verification';

-- Grant permissions (application role should exist)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON risk_assessments TO spaceos_app;
