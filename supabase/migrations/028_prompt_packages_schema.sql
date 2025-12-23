-- ==========================================
-- Migration: Prompt Packages Schema (Phase 1)
-- ==========================================
-- This migration adds support for premium prompt packages while maintaining
-- full backward compatibility. All existing prompts remain free (base game).

-- ==========================================
-- 1. PROMPT PACKAGES TABLE
-- ==========================================
-- Stores metadata about available prompt packages

CREATE TABLE IF NOT EXISTS prompt_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Package Identity
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Theming & Branding
  theme_color TEXT,            -- Hex color for UI theming
  icon TEXT,                   -- Emoji or icon identifier
  cover_image_url TEXT,        -- Optional cover image URL

  -- Pricing & Status
  price_cents INTEGER NOT NULL DEFAULT 99,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Content Stats (denormalized for performance)
  total_prompts INTEGER NOT NULL DEFAULT 0,
  prompts_by_game_type JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  release_date TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT price_positive CHECK (price_cents >= 0),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_packages_active
  ON prompt_packages(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_prompt_packages_featured
  ON prompt_packages(is_featured, is_active);

CREATE INDEX IF NOT EXISTS idx_prompt_packages_slug
  ON prompt_packages(slug);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_prompt_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prompt_packages_updated_at
  BEFORE UPDATE ON prompt_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_packages_updated_at();

COMMENT ON TABLE prompt_packages IS 'Premium prompt packages available for purchase';
COMMENT ON COLUMN prompt_packages.slug IS 'URL-friendly identifier (e.g., date-night, office-icebreakers)';
COMMENT ON COLUMN prompt_packages.price_cents IS 'Price in cents (99 = $0.99)';
COMMENT ON COLUMN prompt_packages.prompts_by_game_type IS 'JSON object with counts per game type';

-- ==========================================
-- 2. GROUP PROMPT PACKAGES TABLE
-- ==========================================
-- Tracks which groups own which packages

CREATE TABLE IF NOT EXISTS group_prompt_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Relationships
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES prompt_packages(id) ON DELETE CASCADE,

  -- Purchase Information
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purchased_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Payment Integration (for future use)
  payment_intent_id TEXT,
  price_paid_cents INTEGER,

  -- Access Control
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,  -- NULL = permanent, or set for time-limited access

  -- Constraints
  CONSTRAINT unique_group_package UNIQUE(group_id, package_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_packages_group
  ON group_prompt_packages(group_id, is_active);

CREATE INDEX IF NOT EXISTS idx_group_packages_package
  ON group_prompt_packages(package_id);

CREATE INDEX IF NOT EXISTS idx_group_packages_active
  ON group_prompt_packages(is_active, expires_at);

COMMENT ON TABLE group_prompt_packages IS 'Tracks which groups have purchased which prompt packages';
COMMENT ON COLUMN group_prompt_packages.expires_at IS 'NULL = permanent access, otherwise access expires at this timestamp';

-- ==========================================
-- 3. MODIFY GAME_PROMPTS TABLE
-- ==========================================
-- Add package_id to associate prompts with packages
-- NULL package_id = base game (free for everyone)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_prompts' AND column_name = 'package_id'
  ) THEN
    ALTER TABLE game_prompts
      ADD COLUMN package_id UUID REFERENCES prompt_packages(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index for package-based prompt queries
CREATE INDEX IF NOT EXISTS idx_game_prompts_package
  ON game_prompts(package_id, game_type, is_active);

-- Composite index for the common query pattern
CREATE INDEX IF NOT EXISTS idx_game_prompts_selection
  ON game_prompts(game_type, is_active, package_id, usage_count);

COMMENT ON COLUMN game_prompts.package_id IS 'NULL = base game (free), otherwise references a premium package';

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

-- Prompt Packages: publicly viewable if active
DROP POLICY IF EXISTS "Packages are publicly viewable" ON prompt_packages;
CREATE POLICY "Packages are publicly viewable"
  ON prompt_packages FOR SELECT
  USING (is_active = true);

-- Group Prompt Packages: groups can view their own purchases
DROP POLICY IF EXISTS "Groups can view own packages" ON group_prompt_packages;
CREATE POLICY "Groups can view own packages"
  ON group_prompt_packages FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid()
    )
  );

-- Group Prompt Packages: admins can purchase
DROP POLICY IF EXISTS "Admins can purchase packages" ON group_prompt_packages;
CREATE POLICY "Admins can purchase packages"
  ON group_prompt_packages FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 5. HELPER FUNCTIONS
-- ==========================================

-- Function to grant a package to a group (for purchase flow)
CREATE OR REPLACE FUNCTION grant_package_to_group(
  p_group_id UUID,
  p_package_id UUID,
  p_purchased_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_package RECORD;
  v_grant_id UUID;
BEGIN
  -- Verify package exists and is active
  SELECT * INTO v_package
  FROM prompt_packages
  WHERE id = p_package_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found or inactive';
  END IF;

  -- Check if group already owns this package
  IF EXISTS (
    SELECT 1 FROM group_prompt_packages
    WHERE group_id = p_group_id
      AND package_id = p_package_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Group already owns this package';
  END IF;

  -- Grant the package
  INSERT INTO group_prompt_packages (
    group_id,
    package_id,
    purchased_by,
    price_paid_cents
  ) VALUES (
    p_group_id,
    p_package_id,
    COALESCE(p_purchased_by, auth.uid()),
    v_package.price_cents
  )
  RETURNING id INTO v_grant_id;

  RETURN v_grant_id;
END;
$$;

COMMENT ON FUNCTION grant_package_to_group IS 'Grant a prompt package to a group (for purchase flow)';

-- Function to check if a group has access to a package
CREATE OR REPLACE FUNCTION group_has_package(
  p_group_id UUID,
  p_package_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM group_prompt_packages
    WHERE group_id = p_group_id
      AND package_id = p_package_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;

COMMENT ON FUNCTION group_has_package IS 'Check if a group has active access to a package';

-- Function to get all packages owned by a group
CREATE OR REPLACE FUNCTION get_group_packages(p_group_id UUID)
RETURNS TABLE (
  package_id UUID,
  package_name TEXT,
  package_slug TEXT,
  purchased_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  total_prompts INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.name,
    pp.slug,
    gpp.purchased_at,
    gpp.expires_at,
    pp.total_prompts
  FROM group_prompt_packages gpp
  JOIN prompt_packages pp ON pp.id = gpp.package_id
  WHERE gpp.group_id = p_group_id
    AND gpp.is_active = true
    AND (gpp.expires_at IS NULL OR gpp.expires_at > NOW())
  ORDER BY gpp.purchased_at DESC;
END;
$$;

COMMENT ON FUNCTION get_group_packages IS 'Get all active packages owned by a group';

-- ==========================================
-- 6. ANALYTICS SUPPORT
-- ==========================================

-- Trigger to update package stats when prompts are added/removed
CREATE OR REPLACE FUNCTION update_package_prompt_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_package_id UUID;
  v_counts JSONB;
BEGIN
  -- Determine which package to update
  IF TG_OP = 'DELETE' THEN
    v_package_id := OLD.package_id;
  ELSE
    v_package_id := NEW.package_id;
  END IF;

  -- Only update if package_id is not NULL
  IF v_package_id IS NOT NULL THEN
    -- Count prompts by game type for this package
    SELECT jsonb_object_agg(game_type, count)
    INTO v_counts
    FROM (
      SELECT game_type, COUNT(*)::int as count
      FROM game_prompts
      WHERE package_id = v_package_id
      GROUP BY game_type
    ) counts;

    -- Update the package
    UPDATE prompt_packages
    SET
      total_prompts = (
        SELECT COUNT(*)
        FROM game_prompts
        WHERE package_id = v_package_id
      ),
      prompts_by_game_type = COALESCE(v_counts, '{}'::jsonb)
    WHERE id = v_package_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_package_counts
  AFTER INSERT OR DELETE ON game_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_package_prompt_count();

COMMENT ON FUNCTION update_package_prompt_count IS 'Automatically update package prompt counts when prompts are added/removed';

-- ==========================================
-- NOTES
-- ==========================================
-- This migration is fully backward compatible:
-- - All existing prompts have package_id = NULL (base game)
-- - Base game prompts remain free for all groups
-- - No changes to existing functionality
-- - Ready for future package purchases
