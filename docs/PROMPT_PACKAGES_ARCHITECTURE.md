# Prompt Packages Architecture

## Overview

This document outlines the architecture for implementing a prompt package system where groups can purchase themed collections of prompts (~50 prompts per package at ~$0.99 each).

## Business Model

- **Base Game**: All current prompts remain free and available to all groups
- **Premium Packages**: Themed collections of ~50 prompts sold individually
- **Pricing**: ~$0.99 per package (configurable)
- **Themes**: Each package focuses on a specific theme (e.g., "Date Night Questions", "Deep Conversations", "Party Games", "Office Icebreakers")

## Database Schema

### New Tables

#### `prompt_packages`
Stores metadata about available prompt packages.

```sql
CREATE TABLE prompt_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Package Identity
  slug TEXT NOT NULL UNIQUE,  -- e.g., 'date-night', 'deep-conversations'
  name TEXT NOT NULL,          -- e.g., 'Date Night Questions'
  description TEXT NOT NULL,   -- Marketing description

  -- Theming
  theme_color TEXT,            -- Hex color for UI theming
  icon TEXT,                   -- Emoji or icon name
  cover_image_url TEXT,        -- Optional cover image

  -- Pricing & Status
  price_cents INTEGER NOT NULL DEFAULT 99,  -- Price in cents
  is_active BOOLEAN NOT NULL DEFAULT true,  -- Can be purchased
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Content Stats (denormalized for performance)
  total_prompts INTEGER NOT NULL DEFAULT 0,
  prompts_by_game_type JSONB,  -- {"would_you_rather": 15, "hot_takes": 10, ...}

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  release_date TIMESTAMPTZ,

  CONSTRAINT price_positive CHECK (price_cents >= 0)
);

CREATE INDEX idx_prompt_packages_active ON prompt_packages(is_active, sort_order);
CREATE INDEX idx_prompt_packages_featured ON prompt_packages(is_featured, is_active);

COMMENT ON TABLE prompt_packages IS 'Premium prompt packages available for purchase';
```

#### `group_prompt_packages`
Tracks which groups own which packages.

```sql
CREATE TABLE group_prompt_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Relationships
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES prompt_packages(id) ON DELETE CASCADE,

  -- Purchase Info
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purchased_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Payment Integration (future)
  payment_intent_id TEXT,  -- Stripe/payment provider ID
  price_paid_cents INTEGER,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,  -- NULL = permanent, or set for subscriptions

  CONSTRAINT unique_group_package UNIQUE(group_id, package_id)
);

CREATE INDEX idx_group_packages_group ON group_prompt_packages(group_id, is_active);
CREATE INDEX idx_group_packages_package ON group_prompt_packages(package_id);

COMMENT ON TABLE group_prompt_packages IS 'Tracks which groups have purchased which prompt packages';
```

### Modified Tables

#### `game_prompts` (existing)
Add `package_id` to associate prompts with packages.

```sql
-- Migration to add package support
ALTER TABLE game_prompts
  ADD COLUMN package_id UUID REFERENCES prompt_packages(id) ON DELETE CASCADE;

-- NULL package_id = base game (free for everyone)
CREATE INDEX idx_game_prompts_package ON game_prompts(package_id, game_type, is_active);

COMMENT ON COLUMN game_prompts.package_id IS 'NULL = base game, otherwise belongs to premium package';
```

## Key Design Decisions

### 1. Package Assignment
- **Prompts belong to ONE package** (or base game if `package_id IS NULL`)
- **Base game prompts**: `package_id IS NULL` - free for everyone
- **Premium prompts**: `package_id` references a package
- This keeps ownership clear and prevents confusion

### 2. Access Control
Groups can access prompts from:
1. Base game (package_id IS NULL)
2. Any packages they've purchased (via group_prompt_packages)

### 3. Prompt Selection Logic
When selecting a random prompt for a group, the query becomes:

```sql
-- Get available prompts for a group
SELECT p.*
FROM game_prompts p
WHERE p.game_type = 'would_you_rather'
  AND p.is_active = true
  AND (
    -- Base game prompts (always available)
    p.package_id IS NULL
    OR
    -- Premium prompts from purchased packages
    p.package_id IN (
      SELECT gpp.package_id
      FROM group_prompt_packages gpp
      WHERE gpp.group_id = $1
        AND gpp.is_active = true
        AND (gpp.expires_at IS NULL OR gpp.expires_at > NOW())
    )
  )
ORDER BY p.usage_count ASC, random()
LIMIT 1;
```

## Implementation Plan

### Phase 1: Database Schema (Non-Breaking)
✅ Can be done now without affecting current functionality

```sql
-- Add tables
CREATE TABLE prompt_packages (...);
CREATE TABLE group_prompt_packages (...);

-- Modify existing table
ALTER TABLE game_prompts ADD COLUMN package_id UUID;
-- All existing prompts will have NULL package_id = base game
```

### Phase 2: Update Prompt Selection Function
Modify `create_scheduled_game` to use the new access control logic.

```sql
-- Before (current):
SELECT id, prompt_data INTO v_prompt_id, v_prompt_data
FROM game_prompts
WHERE game_type = v_selected_game
  AND is_active = true
ORDER BY usage_count ASC, random()
LIMIT 1;

-- After (with packages):
SELECT id, prompt_data INTO v_prompt_id, v_prompt_data
FROM game_prompts
WHERE game_type = v_selected_game
  AND is_active = true
  AND (
    package_id IS NULL  -- Base game
    OR package_id IN (
      SELECT package_id FROM group_prompt_packages
      WHERE group_id = p_group_id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  )
ORDER BY usage_count ASC, random()
LIMIT 1;
```

### Phase 3: Admin Functions
Helper functions for package management:

```sql
-- Create a new package
CREATE FUNCTION create_prompt_package(
  p_slug TEXT,
  p_name TEXT,
  p_description TEXT,
  p_price_cents INTEGER
) RETURNS UUID;

-- Add prompts to a package
CREATE FUNCTION add_prompts_to_package(
  p_package_id UUID,
  p_prompts JSONB[]
) RETURNS INTEGER;

-- Grant package to a group (for purchase flow)
CREATE FUNCTION grant_package_to_group(
  p_group_id UUID,
  p_package_id UUID,
  p_purchased_by UUID
) RETURNS UUID;
```

### Phase 4: UI Components
1. **Package Store Page**: Browse available packages
2. **Package Detail Modal**: View prompts preview, purchase
3. **Group Settings**: View owned packages
4. **Admin Package Creator**: Create and manage packages

## Migration Strategy

### Current State → Packages Enabled

**Step 1**: Run schema migration
- Add new tables
- Add `package_id` column (all existing prompts = NULL = base game)
- No breaking changes - system continues working normally

**Step 2**: Update functions
- Modify `create_scheduled_game` to respect package ownership
- Still works for all existing groups (they get base game prompts)

**Step 3**: Create first package
- Create a "Premium Questions Vol. 1" package
- Add 50 new prompts to this package
- Test purchase flow with test group

**Step 4**: Launch
- Enable UI for purchasing packages
- Integrate payment provider (Stripe, etc.)

## Example Package Themes

### Date Night ($0.99)
- 50 questions designed for couples
- Mix of all game types focused on relationships
- Tags: `['couples', 'romance', 'deep']`

### Office Icebreakers ($0.99)
- 50 work-appropriate questions
- Great for team building
- Tags: `['work', 'professional', 'team-building']`

### Party Pack ($0.99)
- 50 high-energy, fun questions
- Perfect for large groups
- Tags: `['party', 'fun', 'social']`

### Deep Conversations ($0.99)
- 50 thought-provoking questions
- Philosophical and meaningful
- Tags: `['deep', 'philosophical', 'meaningful']`

### Family Friendly ($0.99)
- 50 all-ages appropriate questions
- Safe for playing with kids/parents
- Tags: `['family', 'all-ages', 'wholesome']`

## Package Metadata Example

```json
{
  "slug": "date-night",
  "name": "Date Night Questions",
  "description": "50 engaging questions designed to spark deeper conversations with your partner. From lighthearted fun to meaningful discussions.",
  "theme_color": "#FF6B9D",
  "icon": "💕",
  "price_cents": 99,
  "prompts_by_game_type": {
    "would_you_rather": 15,
    "hot_takes": 10,
    "guess_who_said_it": 15,
    "most_likely_to": 10
  },
  "total_prompts": 50,
  "tags": ["couples", "romance", "deep", "fun"],
  "sample_prompts": [
    "Would you rather relive our first date or fast-forward to our 10-year anniversary?",
    "What's one thing you've never told me but want to?",
    "Most likely to plan a surprise romantic getaway"
  ]
}
```

## Revenue & Analytics

### Tracking Tables (Future)

```sql
-- Track package performance
CREATE TABLE package_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES prompt_packages(id),
  date DATE NOT NULL,

  -- Metrics
  views INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  refunds INTEGER DEFAULT 0,

  UNIQUE(package_id, date)
);

-- Track prompt usage from packages
ALTER TABLE game_prompts
  ADD COLUMN times_used INTEGER DEFAULT 0;
```

## RLS Policies

```sql
-- Prompt packages are publicly viewable
CREATE POLICY "Packages are publicly viewable"
  ON prompt_packages FOR SELECT
  USING (is_active = true);

-- Groups can view their own purchases
CREATE POLICY "Groups can view own packages"
  ON group_prompt_packages FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid()
    )
  );

-- Only group admins can purchase
CREATE POLICY "Admins can purchase packages"
  ON group_prompt_packages FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Prompts: users can see base game + owned packages
CREATE POLICY "Users can view accessible prompts"
  ON game_prompts FOR SELECT
  USING (
    is_active = true
    AND (
      package_id IS NULL  -- Base game
      OR package_id IN (
        SELECT gpp.package_id
        FROM group_prompt_packages gpp
        JOIN group_members gm ON gm.group_id = gpp.group_id
        WHERE gm.user_id = auth.uid()
          AND gpp.is_active = true
      )
    )
  );
```

## Benefits of This Architecture

### 1. **Backward Compatible**
- All current prompts remain free (package_id IS NULL)
- No changes needed to existing prompts
- System works exactly the same until packages are purchased

### 2. **Scalable**
- Easy to add unlimited packages
- No limit on prompts per package
- Supports future features (subscriptions, bundles, etc.)

### 3. **Flexible**
- Can grant packages for free (promotions, testing)
- Can set expiration dates (time-limited access)
- Can deactivate packages without deleting prompts

### 4. **Clear Ownership**
- Each prompt belongs to exactly one package (or base game)
- No confusion about access rights
- Easy to understand and query

### 5. **Performance**
- Indexed queries for fast prompt selection
- Denormalized counts for quick package browsing
- Minimal JOINs in hot path

## Future Enhancements

### Package Bundles
```sql
CREATE TABLE package_bundles (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  price_cents INTEGER,
  discount_percent INTEGER,
  package_ids UUID[] -- Array of included packages
);
```

### Subscriptions
```sql
-- Monthly subscription for all packages
ALTER TABLE group_prompt_packages
  ADD COLUMN subscription_tier TEXT,  -- 'monthly', 'yearly'
  ADD COLUMN auto_renew BOOLEAN DEFAULT false;
```

### User-Created Prompts (Future Business Model)
```sql
-- Let users submit prompts, admin approves, user gets revenue share
CREATE TABLE user_submitted_prompts (
  id UUID PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  prompt_data JSONB,
  status TEXT,  -- 'pending', 'approved', 'rejected'
  revenue_share_percent INTEGER DEFAULT 50
);
```

## Next Steps (Recommended Order)

1. ✅ **Document architecture** (this file)
2. **Create migration 028** - Add tables (non-breaking)
3. **Create sample package data** - One test package with 10 prompts
4. **Update prompt selection** - Modify `create_scheduled_game` function
5. **Test package access** - Verify groups only see owned packages
6. **Build package store UI** - Browse and view packages
7. **Integrate payments** - Stripe Checkout for purchases
8. **Create admin tools** - Package creation interface
9. **Launch first premium package**

## Testing Checklist

- [ ] Base game prompts still work for all groups
- [ ] Groups with no packages only see base game prompts
- [ ] Groups with purchased package see base + package prompts
- [ ] Prompt selection respects package ownership
- [ ] Package expiration works (if expires_at is set)
- [ ] Deactivated packages don't show prompts
- [ ] RLS policies prevent unauthorized access
- [ ] Purchase flow creates proper records
- [ ] Analytics track package performance

---

**Note**: This architecture is designed to be implemented incrementally without breaking existing functionality. The first migration (adding tables and columns) can be done immediately with zero impact.
