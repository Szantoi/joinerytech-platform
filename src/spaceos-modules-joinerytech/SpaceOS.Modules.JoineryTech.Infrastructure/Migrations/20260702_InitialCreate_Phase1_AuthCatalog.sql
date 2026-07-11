-- JoineryTech Phase 1: Auth + Catalog Initial Schema
-- Created: 2026-07-02
-- Module: SpaceOS.Modules.JoineryTech
-- Purpose: Multi-tenant SaaS foundation with catalog management

-- =============================================
-- SCHEMA: jt_core (Auth & Tenant Management)
-- =============================================

CREATE SCHEMA IF NOT EXISTS jt_core;

-- Tenants table (root of multi-tenancy)
CREATE TABLE jt_core.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'suspended', 'trial')),
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('free', 'premium', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (multi-tenant aware)
CREATE TABLE jt_core.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES jt_core.tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);

-- Indexes for users
CREATE INDEX idx_users_tenant_status ON jt_core.users(tenant_id, status);
CREATE INDEX idx_users_email ON jt_core.users(email);
CREATE INDEX idx_users_tenant_roles ON jt_core.users(tenant_id) WHERE roles::text LIKE '%admin%';

-- RLS Policy for users
ALTER TABLE jt_core.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON jt_core.users
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Refresh tokens table (JWT refresh token management)
CREATE TABLE jt_core.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jt_core.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  device_name VARCHAR(100),
  device_fingerprint VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for refresh tokens
CREATE INDEX idx_refresh_tokens_user ON jt_core.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON jt_core.refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- RLS Policy for refresh_tokens
ALTER TABLE jt_core.refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON jt_core.refresh_tokens
  USING (
    EXISTS (
      SELECT 1 FROM jt_core.users u
      WHERE u.id = user_id
      AND u.tenant_id = current_setting('app.tenant_id')::uuid
    )
  );

-- =============================================
-- SCHEMA: jt_catalog (Product Catalog)
-- =============================================

CREATE SCHEMA IF NOT EXISTS jt_catalog;

-- Catalog categories (hierarchical, self-referencing)
CREATE TABLE jt_catalog.catalog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES jt_core.tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES jt_catalog.catalog_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_category_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- Indexes for catalog_categories
CREATE INDEX idx_catalog_categories_tenant ON jt_catalog.catalog_categories(tenant_id);
CREATE INDEX idx_catalog_categories_parent ON jt_catalog.catalog_categories(parent_id);
CREATE INDEX idx_catalog_categories_slug ON jt_catalog.catalog_categories(tenant_id, slug);

-- RLS Policy for catalog_categories
ALTER TABLE jt_catalog.catalog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON jt_catalog.catalog_categories
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Catalog items (products/services)
CREATE TABLE jt_catalog.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES jt_core.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES jt_catalog.catalog_categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  description TEXT,
  base_price DECIMAL(12,2) CHECK (base_price >= 0),
  unit VARCHAR(50) DEFAULT 'unit',
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'discontinued', 'draft')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_sku_per_tenant UNIQUE (tenant_id, sku)
);

-- Indexes for catalog_items
CREATE INDEX idx_catalog_items_tenant_status ON jt_catalog.catalog_items(tenant_id, status);
CREATE INDEX idx_catalog_items_category ON jt_catalog.catalog_items(category_id);
CREATE INDEX idx_catalog_items_sku ON jt_catalog.catalog_items(tenant_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_catalog_items_name_search ON jt_catalog.catalog_items USING gin(to_tsvector('hungarian', name));

-- RLS Policy for catalog_items
ALTER TABLE jt_catalog.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON jt_catalog.catalog_items
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to set updated_at on UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON jt_core.tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON jt_core.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalog_categories_updated_at BEFORE UPDATE ON jt_catalog.catalog_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON jt_catalog.catalog_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL SEED DATA (Development/Testing)
-- =============================================

-- Seed Tenant (Development tenant)
INSERT INTO jt_core.tenants (id, name, slug, status, account_type)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Demo Tenant', 'demo-tenant', 'active', 'premium')
ON CONFLICT DO NOTHING;

-- Seed Users (5 users with different roles)
INSERT INTO jt_core.users (id, tenant_id, email, password_hash, first_name, last_name, roles, permissions, status)
VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'admin@demo.com',
    '$2a$11$hashed_password_admin', -- TODO: Replace with actual bcrypt hash
    'Admin',
    'User',
    '["admin"]'::jsonb,
    '["catalog.read", "catalog.write", "catalog.admin"]'::jsonb,
    'active'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'sales@demo.com',
    '$2a$11$hashed_password_sales',
    'Sales',
    'Lead',
    '["sales_lead"]'::jsonb,
    '["catalog.read", "catalog.write"]'::jsonb,
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'purchasing@demo.com',
    '$2a$11$hashed_password_purchasing',
    'Purchasing',
    'Manager',
    '["purchasing"]'::jsonb,
    '["catalog.read"]'::jsonb,
    'active'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'production@demo.com',
    '$2a$11$hashed_password_production',
    'Production',
    'Manager',
    '["production"]'::jsonb,
    '["catalog.read"]'::jsonb,
    'active'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    'viewer@demo.com',
    '$2a$11$hashed_password_viewer',
    'View',
    'Only',
    '["viewer"]'::jsonb,
    '["catalog.read"]'::jsonb,
    'active'
  )
ON CONFLICT DO NOTHING;

-- Seed Catalog Categories
INSERT INTO jt_catalog.catalog_categories (id, tenant_id, parent_id, name, slug, description, display_order, status)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, 'Raw Materials', 'raw-materials', 'Base materials for production', 1, 'active'),
  ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', NULL, 'Finished Products', 'finished-products', 'Ready-to-ship products', 2, 'active'),
  ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Wood Panels', 'wood-panels', 'Various wood panel types', 1, 'active'),
  ('aaaa4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Hardware', 'hardware', 'Hinges, handles, locks', 2, 'active')
ON CONFLICT DO NOTHING;

-- Seed Catalog Items (20 sample items)
INSERT INTO jt_catalog.catalog_items (id, tenant_id, category_id, name, sku, description, base_price, unit, status)
VALUES
  ('bbbb0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Oak Veneer Panel 18mm', 'WP-OAK-18', 'Natural oak veneer MDF panel, 2800x2070mm', 45000.00, 'm2', 'active'),
  ('bbbb0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Walnut Veneer Panel 18mm', 'WP-WAL-18', 'Natural walnut veneer MDF panel, 2800x2070mm', 52000.00, 'm2', 'active'),
  ('bbbb0003-0003-0003-0003-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'White Laminate Panel 18mm', 'WP-LAM-WHT-18', 'White high-gloss laminate panel, 2800x2070mm', 28000.00, 'm2', 'active'),
  ('bbbb0004-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Black Laminate Panel 18mm', 'WP-LAM-BLK-18', 'Black high-gloss laminate panel, 2800x2070mm', 28000.00, 'm2', 'active'),
  ('bbbb0005-0005-0005-0005-000000000005', '11111111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Beech Veneer Panel 18mm', 'WP-BCH-18', 'Natural beech veneer MDF panel, 2800x2070mm', 42000.00, 'm2', 'active'),
  ('bbbb0006-0006-0006-0006-000000000006', '11111111-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Concealed Hinge 110°', 'HW-HNG-110', 'Blum soft-close concealed hinge, 110° opening', 890.00, 'unit', 'active'),
  ('bbbb0007-0007-0007-0007-000000000007', '11111111-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Concealed Hinge 165°', 'HW-HNG-165', 'Blum soft-close concealed hinge, 165° opening', 950.00, 'unit', 'active'),
  ('bbbb0008-0008-0008-0008-000000000008', '11111111-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Door Handle Chrome', 'HW-HDL-CHR', 'Stainless steel chrome door handle, 128mm centers', 1200.00, 'unit', 'active'),
  ('bbbb0009-0009-0009-0009-000000000009', '11111111-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Door Handle Brushed', 'HW-HDL-BRU', 'Stainless steel brushed door handle, 128mm centers', 1350.00, 'unit', 'active'),
  ('bbbb0010-0010-0010-0010-000000000010', '11111111-1111-1111-1111-111111111111', 'aaaa4444-4444-4444-4444-444444444444', 'Cylinder Lock', 'HW-LCK-CYL', 'Euro profile cylinder lock with 3 keys', 2800.00, 'unit', 'active'),
  ('bbbb0011-0011-0011-0011-000000000011', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Kitchen Cabinet Base 60cm', 'FP-KIT-B60', 'Base kitchen cabinet, white, 60x60x85cm', 78000.00, 'unit', 'active'),
  ('bbbb0012-0012-0012-0012-000000000012', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Kitchen Cabinet Base 80cm', 'FP-KIT-B80', 'Base kitchen cabinet, white, 80x60x85cm', 92000.00, 'unit', 'active'),
  ('bbbb0013-0013-0013-0013-000000000013', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Kitchen Cabinet Wall 60cm', 'FP-KIT-W60', 'Wall kitchen cabinet, white, 60x35x70cm', 62000.00, 'unit', 'active'),
  ('bbbb0014-0014-0014-0014-000000000014', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Kitchen Cabinet Wall 80cm', 'FP-KIT-W80', 'Wall kitchen cabinet, white, 80x35x70cm', 74000.00, 'unit', 'active'),
  ('bbbb0015-0015-0015-0015-000000000015', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Wardrobe 2-Door Oak', 'FP-WAR-2D-OAK', '2-door wardrobe, oak veneer, 100x60x200cm', 185000.00, 'unit', 'active'),
  ('bbbb0016-0016-0016-0016-000000000016', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Wardrobe 3-Door Oak', 'FP-WAR-3D-OAK', '3-door wardrobe, oak veneer, 150x60x200cm', 265000.00, 'unit', 'active'),
  ('bbbb0017-0017-0017-0017-000000000017', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Wardrobe 2-Door Walnut', 'FP-WAR-2D-WAL', '2-door wardrobe, walnut veneer, 100x60x200cm', 210000.00, 'unit', 'active'),
  ('bbbb0018-0018-0018-0018-000000000018', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Wardrobe 3-Door Walnut', 'FP-WAR-3D-WAL', '3-door wardrobe, walnut veneer, 150x60x200cm', 295000.00, 'unit', 'active'),
  ('bbbb0019-0019-0019-0019-000000000019', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Desk Oak 140cm', 'FP-DSK-OAK-140', 'Office desk, oak veneer, 140x70x75cm', 145000.00, 'unit', 'active'),
  ('bbbb0020-0020-0020-0020-000000000020', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Desk Walnut 160cm', 'FP-DSK-WAL-160', 'Office desk, walnut veneer, 160x80x75cm', 175000.00, 'unit', 'active')
ON CONFLICT DO NOTHING;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify schema creation
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name IN ('jt_core', 'jt_catalog');

-- Verify table counts
SELECT
  'tenants' as table_name, COUNT(*) as row_count FROM jt_core.tenants
UNION ALL
SELECT 'users', COUNT(*) FROM jt_core.users
UNION ALL
SELECT 'catalog_categories', COUNT(*) FROM jt_catalog.catalog_categories
UNION ALL
SELECT 'catalog_items', COUNT(*) FROM jt_catalog.catalog_items;

-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname IN ('jt_core', 'jt_catalog')
ORDER BY schemaname, tablename;
