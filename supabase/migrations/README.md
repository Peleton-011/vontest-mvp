# Database Migrations for Social Games Platform

This directory contains SQL migration scripts to add social game functionality to your Vontests platform.

## Overview

These migrations add:
- **Groups** - Friend groups that play games together
- **Game Instances** - Daily games for each group
- **Responses & Votes** - User participation in games
- **Analytics** - Distribution curves and statistics
- **Scoring & Leaderboards** - Points and rankings
- **Debate Matching** - Auto-pairing for Hot Takes game
- **Phase Management** - Multi-phase games (Guess Who Said It)
- **Thread Integration** - Discussion threads for games

## Migration Order

**IMPORTANT:** Run these migrations in order!

```
001_groups_and_members.sql           ← Groups, members, invitations
002_game_instances_core.sql          ← Games, responses, votes
003_mvp_enhanced_features.sql        ← Analytics, scoring, debates, phases
004_threads_integration.sql          ← Thread system integration
005_helper_views_and_functions.sql   ← Utility views and functions
```

## How to Run

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `001_groups_and_members.sql`
5. Paste into the editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Repeat for files 002-005 in order

### Option 2: Supabase CLI

If you have the Supabase CLI installed locally:

```bash
# Make sure you're in the project root
cd /home/user/vontest-mvp

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

### Option 3: Manual psql

If you have direct database access:

```bash
psql "your-supabase-connection-string" < supabase/migrations/001_groups_and_members.sql
psql "your-supabase-connection-string" < supabase/migrations/002_game_instances_core.sql
psql "your-supabase-connection-string" < supabase/migrations/003_mvp_enhanced_features.sql
psql "your-supabase-connection-string" < supabase/migrations/004_threads_integration.sql
psql "your-supabase-connection-string" < supabase/migrations/005_helper_views_and_functions.sql
```

## After Running Migrations

### 1. Verify Tables Created

Run this query in SQL Editor to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'groups',
  'group_members',
  'group_invitations',
  'game_instances',
  'game_responses',
  'game_votes',
  'game_analytics',
  'debate_matches',
  'game_user_scores',
  'game_leaderboards',
  'game_phase_history'
)
ORDER BY table_name;
```

You should see all 11 tables listed.

### 2. Regenerate TypeScript Types

Run this command in your project root:

```bash
npx supabase gen types typescript --project-id your-project-id > types/supabase.ts
```

Or using the project ID from your README:

```bash
npx supabase gen types typescript --project-id "tawensvvfjiaspqzqzqi" --schema public > ./types/supabase.ts
```

### 3. Test RLS Policies

Create a test group to verify RLS is working:

```sql
-- Should work (creates group and auto-adds you as admin)
INSERT INTO groups (name, description, created_by)
VALUES ('Test Group', 'Testing RLS policies', auth.uid());

-- Check if you were added as admin
SELECT * FROM group_members WHERE user_id = auth.uid();

-- Check if you can see the group
SELECT * FROM groups;
```

## New Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `groups` | Friend groups |
| `group_members` | Group membership with roles |
| `group_invitations` | Pending group invites |
| `game_instances` | Daily game instances |
| `game_responses` | User submissions/responses |
| `game_votes` | User votes on options/users |

### Enhanced Features

| Table | Purpose |
|-------|---------|
| `game_analytics` | Distribution curves, outliers |
| `debate_matches` | Paired debates for Hot Takes |
| `game_user_scores` | Points per game per user |
| `game_leaderboards` | Rankings by timeframe |
| `game_phase_history` | Phase transition tracking |

### Useful Views

| View | Purpose |
|------|---------|
| `user_groups_with_stats` | Groups with member/game counts |
| `active_games_with_stats` | Active games with participation |
| `user_participation_summary` | User participation across groups |
| `recent_games_detailed` | Recent games with full stats |

## Key Functions

### Groups
- `add_creator_as_admin()` - Auto-adds creator as admin
- `accept_group_invitation(UUID)` - Accept invite and join group

### Games
- `get_active_game(UUID)` - Get current active game for group
- `expire_old_games()` - Mark expired games
- `complete_game(UUID)` - Mark game as completed

### Analytics
- `calculate_intensity_distribution(UUID)` - Compute distribution stats
- `all_members_responded(UUID)` - Check if everyone participated

### Scoring
- `award_game_points(UUID, UUID, INTEGER, TEXT)` - Award points
- `calculate_leaderboard(UUID, TEXT, TEXT)` - Update leaderboard
- `award_participation_points(UUID)` - Award 1pt to all responders

### Phases
- `advance_game_phase(UUID, TEXT)` - Move to next phase

### Threads
- `create_game_thread(UUID)` - Create thread for game
- `create_debate_thread(UUID)` - Create thread for debate
- `create_group_chat_thread(UUID)` - Create/get group chat

### Utility
- `get_user_groups(UUID)` - Get user's groups
- `get_group_game_history(UUID, INT, INT)` - Paginated history
- `get_pending_games_for_user(UUID)` - Games not responded to
- `get_game_results(UUID)` - Full results summary
- `get_group_members_with_stats(UUID)` - Members with scores
- `get_non_responders(UUID)` - Who hasn't responded yet

## Thread Types

Your existing `threads` table now supports these types:

| Type | Reference ID Points To |
|------|----------------------|
| `vontest` | vontests.id (existing) |
| `proposal` | proposals.id (existing) |
| `game_instance` | game_instances.id (NEW) |
| `game_general` | groups.id (NEW) |
| `debate_match` | debate_matches.id (NEW) |

## Rollback

If you need to rollback these migrations:

```sql
-- Run in reverse order
DROP TABLE IF EXISTS game_phase_history CASCADE;
DROP TABLE IF EXISTS game_leaderboards CASCADE;
DROP TABLE IF EXISTS game_user_scores CASCADE;
DROP TABLE IF EXISTS debate_matches CASCADE;
DROP TABLE IF EXISTS game_analytics CASCADE;
DROP TABLE IF EXISTS game_votes CASCADE;
DROP TABLE IF EXISTS game_responses CASCADE;
DROP TABLE IF EXISTS game_instances CASCADE;
DROP TABLE IF EXISTS group_invitations CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- Drop views
DROP VIEW IF EXISTS user_groups_with_stats CASCADE;
DROP VIEW IF EXISTS active_games_with_stats CASCADE;
DROP VIEW IF EXISTS user_participation_summary CASCADE;
DROP VIEW IF EXISTS recent_games_detailed CASCADE;
DROP VIEW IF EXISTS game_instances_with_threads CASCADE;
DROP VIEW IF EXISTS debate_matches_with_threads CASCADE;

-- Drop functions (only game-related ones)
DROP FUNCTION IF EXISTS add_creator_as_admin() CASCADE;
DROP FUNCTION IF EXISTS accept_group_invitation(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_intensity_distribution(UUID) CASCADE;
DROP FUNCTION IF EXISTS award_game_points(UUID, UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS calculate_leaderboard(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS advance_game_phase(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS all_members_responded(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_game_thread(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_debate_thread(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_group_chat_thread(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_game_thread(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_thread_for_new_game() CASCADE;
DROP FUNCTION IF EXISTS create_thread_for_new_debate() CASCADE;
DROP FUNCTION IF EXISTS get_user_groups(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_group_game_history(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS user_can_access_game(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_pending_games_for_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_game_results(UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_game(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_group_members_with_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS award_participation_points(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_non_responders(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_active_game(UUID) CASCADE;
DROP FUNCTION IF EXISTS expire_old_games() CASCADE;
```

## Troubleshooting

### Error: "relation already exists"

Some tables might already exist. You can either:
- Skip that migration
- Or modify the migration to use `CREATE TABLE IF NOT EXISTS`

All migrations already use `IF NOT EXISTS` so they're safe to re-run.

### Error: "permission denied"

Make sure you're running as the database owner or have sufficient privileges.

### Error: "foreign key violation"

Make sure migrations run in order. Later migrations depend on tables created in earlier ones.

### RLS Blocking Queries

If RLS is blocking legitimate queries, check:
1. User is authenticated (`auth.uid()` returns their ID)
2. User is member of the group
3. Policies are correctly configured

Debug RLS with:
```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM groups; -- Test if policies work
```

## Next Steps

After migrations are complete:

1. ✅ Regenerate TypeScript types
2. 📝 Create composables (`useGroups`, `useGameInstances`, etc.)
3. 🎨 Build UI components for groups
4. 🎮 Implement first game type (Would You Rather)
5. ⚡ Create Edge Functions for daily game generation

See the main implementation plan for details!
