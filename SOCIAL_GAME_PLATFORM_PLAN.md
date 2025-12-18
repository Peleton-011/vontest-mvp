# Social Game Platform - Detailed Implementation Plan

## Executive Summary

This document provides a concrete, actionable plan to transform the Vontests MVP into a dual-purpose platform that supports both the existing deliberation system and a new social game application for friend groups.

**Current State:** Nuxt 3 + Supabase app with voting, proposals, comments, and threads
**Target State:** Monorepo with shared infrastructure supporting both Vontests and social games
**Estimated Timeline:** 8-12 weeks for MVP (3 games, core features)
**Complexity Level:** Medium-High (new domain, some rewrites needed)

---

## Part 1: Current State Analysis

### Existing Infrastructure (✅ Reusable)

| Component | Current Implementation | Reusability | Notes |
|-----------|----------------------|-------------|-------|
| **Auth & Profiles** | Supabase Auth + profiles table | 100% | Direct reuse, no changes needed |
| **Comments System** | DAG-based comment trees with `comments`, `comment_links`, `threads` | 95% | Just add new thread types for games |
| **Database Client** | Supabase client, composable pattern | 100% | Proven pattern to replicate |
| **UI Framework** | Nuxt UI + Tailwind + Ionic | 100% | Shared component library |
| **Mobile Support** | Capacitor for iOS/Android | 100% | Already configured |

### Existing Infrastructure (⚠️ Not Reusable)

| Component | Current Implementation | Why Not Reusable | Alternative Needed |
|-----------|----------------------|------------------|-------------------|
| **Voting System** | Complex ballot-based system with `ballots`, `votes`, `proposals`, `voting_settings` supporting IRV/ranked choice | Too complex for simple game voting | Build lightweight `game_votes` table with simple one-vote-per-user logic |
| **Content Model** | Vontests are open-ended deliberations with proposals | Games need structured, templated prompts | New `game_instances` and `game_responses` tables |
| **Scheduling** | None (user-initiated content) | Games need daily automated generation | Supabase Edge Functions + cron |
| **Notifications** | Minimal | Games require push notifications at specific times | Capacitor Push + Edge Functions |

---

## Part 2: Architecture Design

### Database Schema Changes

#### New Tables Required

```sql
-- ==========================================
-- GROUPS MODULE
-- ==========================================

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 50),
  description TEXT CHECK (length(description) <= 500),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avatar_url TEXT DEFAULT '',
  settings JSONB NOT NULL DEFAULT '{
    "enabled_games": ["would_you_rather", "guess_who_said_it", "most_likely_to"],
    "notification_time": "09:00",
    "timezone": "UTC"
  }'::jsonb
);

CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT, -- For inviting non-users
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  CONSTRAINT invited_user_or_email CHECK (
    (invited_user_id IS NOT NULL AND email IS NULL) OR
    (invited_user_id IS NULL AND email IS NOT NULL)
  )
);

-- ==========================================
-- GAME INSTANCES MODULE
-- ==========================================

CREATE TABLE game_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN (
    'would_you_rather',
    'guess_who_said_it',
    'most_likely_to',
    'hot_take',
    'never_have_i_ever'
  )),
  prompt JSONB NOT NULL, -- Game-specific structure
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'expired')) DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb -- For storing results, stats, etc.
);

CREATE TABLE game_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL, -- Flexible structure per game type
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_instance_id, user_id) -- One response per user per game
);

CREATE TABLE game_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  voted_for_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- For "most likely to" style games
  voted_option TEXT, -- For "would you rather" style games
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure one vote per voter per game (composite unique constraint)
  UNIQUE(game_instance_id, voter_id)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX idx_game_instances_group_status ON game_instances(group_id, status);
CREATE INDEX idx_game_instances_expires ON game_instances(expires_at) WHERE status = 'active';
CREATE INDEX idx_game_responses_instance ON game_responses(game_instance_id);
CREATE INDEX idx_game_votes_instance ON game_votes(game_instance_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_invitations_status ON group_invitations(status, expires_at);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_votes ENABLE ROW LEVEL SECURITY;

-- Groups: Can see if you're a member
CREATE POLICY "Users can view groups they belong to"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- Groups: Can create new groups
CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Groups: Admins can update
CREATE POLICY "Group admins can update"
  ON groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Group members: Can see members of your groups
CREATE POLICY "Users can view members of their groups"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

-- Game instances: Members can view group games
CREATE POLICY "Members can view group games"
  ON game_instances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = game_instances.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Game responses: Members can insert/view responses
CREATE POLICY "Members can create responses"
  ON game_responses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_instance_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view group game responses"
  ON game_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_instance_id
      AND gm.user_id = auth.uid()
    )
  );

-- Game votes: Similar to responses
CREATE POLICY "Members can vote"
  ON game_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_instance_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view votes"
  ON game_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_instance_id
      AND gm.user_id = auth.uid()
    )
  );
```

#### Modifications to Existing Tables

```sql
-- Add new thread types for games
-- No schema change needed! threads.type is TEXT, so we just use new values:
-- - 'game_instance' -> references game_instances.id
-- - 'game_general' -> references groups.id (for general group chat)
-- - 'vontest' -> existing
-- - 'proposal' -> existing
```

### Application Architecture

```
vontest-mvp/
├── composables/
│   ├── games/              # NEW: Game-specific composables
│   │   ├── useGroups.ts
│   │   ├── useGameInstances.ts
│   │   ├── useGameResponses.ts
│   │   ├── useGameVotes.ts
│   │   └── useGameNotifications.ts
│   ├── useComments.ts      # EXISTING: No changes
│   ├── useThread.ts        # MODIFY: Add game thread types
│   └── useVontests.ts      # EXISTING: No changes
│
├── components/
│   ├── games/              # NEW: Game components
│   │   ├── GroupCard.vue
│   │   ├── GroupMemberList.vue
│   │   ├── GameInstanceCard.vue
│   │   ├── game-types/
│   │   │   ├── WouldYouRather.vue
│   │   │   ├── GuessWhoSaidIt.vue
│   │   │   ├── MostLikelyTo.vue
│   │   │   ├── HotTake.vue
│   │   │   └── NeverHaveIEver.vue
│   │   └── GameResults.vue
│   ├── ui/                 # EXISTING: Shared UI components
│   └── Form/               # EXISTING: Reuse form components
│
├── pages/
│   ├── games/              # NEW: Game pages
│   │   ├── index.vue       # List of user's groups
│   │   ├── new.vue         # Create new group
│   │   ├── [groupId]/
│   │   │   ├── index.vue   # Group home (current game + history)
│   │   │   ├── members.vue # Manage members
│   │   │   ├── settings.vue # Group settings
│   │   │   └── game/
│   │   │       └── [gameId].vue # Individual game view
│   ├── vontests/           # EXISTING: No changes
│   └── proposals/          # EXISTING: No changes
│
├── server/
│   ├── api/
│   │   └── games/          # NEW: Game-specific endpoints (if needed)
│   └── utils/              # EXISTING: Reuse protectRoute, etc.
│
├── supabase/
│   ├── functions/          # NEW: Edge Functions
│   │   ├── daily-game-generator/
│   │   │   └── index.ts    # Cron job to create daily games
│   │   └── send-game-notifications/
│   │       └── index.ts    # Send push notifications
│   └── migrations/         # NEW: Database migrations
│       ├── 20250101_add_groups.sql
│       ├── 20250102_add_game_instances.sql
│       └── 20250103_add_game_rls_policies.sql
│
├── types/
│   ├── supabase.ts         # MODIFY: Regenerate with new tables
│   └── games.ts            # NEW: Game-specific types
│
└── utils/
    └── games/              # NEW: Game logic utilities
        ├── gamePrompts.ts  # Prompt templates and generation
        └── gameScoring.ts  # Results calculation
```

---

## Part 3: Implementation Phases

### Phase 1: Foundation & Groups (Weeks 1-2)

**Goal:** Set up database, implement groups CRUD, test RLS policies

#### Tasks

1. **Database Setup** (3 days)
   - [ ] Create migration files for all new tables
   - [ ] Write comprehensive RLS policies
   - [ ] Create database indexes
   - [ ] Test policies in Supabase SQL Editor
   - [ ] Regenerate TypeScript types with `supabase gen types`

2. **Groups Composable** (2 days)
   - [ ] Create `composables/games/useGroups.ts` (follow pattern from `useVontests.ts`)
   - [ ] Implement: `fetchGroups()`, `createGroup()`, `updateGroup()`, `deleteGroup()`
   - [ ] Add form reactivity with `reactive()` and `toRefs()`
   - [ ] Handle error states

3. **Group Members Composable** (2 days)
   - [ ] Create `composables/games/useGroupMembers.ts`
   - [ ] Implement: `fetchMembers()`, `addMember()`, `removeMember()`, `updateRole()`
   - [ ] Add invitation logic: `sendInvitation()`, `acceptInvitation()`, `declineInvitation()`

4. **Group UI Components** (3 days)
   - [ ] `components/games/GroupCard.vue` - Display group info, member count, last game
   - [ ] `components/games/GroupMemberList.vue` - List members with role badges
   - [ ] `components/games/CreateGroupForm.vue` - Form with validation
   - [ ] `components/games/InviteMemberModal.vue` - Search/invite users

5. **Group Pages** (2 days)
   - [ ] `pages/games/index.vue` - List all user's groups
   - [ ] `pages/games/new.vue` - Create group form
   - [ ] `pages/games/[groupId]/index.vue` - Group home (placeholder for now)
   - [ ] `pages/games/[groupId]/members.vue` - Member management
   - [ ] `pages/games/[groupId]/settings.vue` - Edit group name, description, avatar

**Deliverable:** Users can create groups, invite members, manage roles

---

### Phase 2: Game Instances & First Game Type (Weeks 3-4)

**Goal:** Implement game instance system + "Would You Rather" game

#### Tasks

1. **Game Instances Composable** (2 days)
   - [ ] Create `composables/games/useGameInstances.ts`
   - [ ] Implement: `fetchGroupGames()`, `fetchActiveGame()`, `fetchGameHistory()`
   - [ ] Add real-time subscription for new games using Supabase Realtime

2. **Game Responses & Votes Composables** (2 days)
   - [ ] Create `composables/games/useGameResponses.ts`
   - [ ] Implement: `submitResponse()`, `fetchResponses()`, `updateResponse()`
   - [ ] Create `composables/games/useGameVotes.ts`
   - [ ] Implement: `submitVote()`, `fetchVotes()`, `checkIfVoted()`

3. **Prompt Generation Utilities** (2 days)
   - [ ] Create `utils/games/gamePrompts.ts`
   - [ ] Define prompt templates for each game type
   - [ ] Implement `generatePrompt(gameType: string)` with randomization
   - [ ] Create seed data: 50+ "Would You Rather" questions

4. **Would You Rather Game** (3 days)
   - [ ] `components/games/game-types/WouldYouRather.vue`
   - [ ] Display two options with vote buttons
   - [ ] Show live vote counts after user votes
   - [ ] Display who voted for what (if all members responded)
   - [ ] Handle edge cases: already voted, game expired

5. **Game Results Component** (2 days)
   - [ ] `components/games/GameResults.vue`
   - [ ] Show vote breakdown with percentages
   - [ ] List who voted for each option
   - [ ] Add simple animations for result reveal

6. **Update Group Home Page** (2 days)
   - [ ] Show today's active game prominently
   - [ ] List past games in scrollable feed
   - [ ] Show participation status (who hasn't responded yet)
   - [ ] Add "Game History" tab

**Deliverable:** Groups have daily "Would You Rather" games that members can vote on

---

### Phase 3: Game Generation & Scheduling (Week 5)

**Goal:** Automate daily game creation with Supabase Edge Functions

#### Tasks

1. **Daily Game Generator Edge Function** (3 days)
   - [ ] Create `supabase/functions/daily-game-generator/index.ts`
   - [ ] Fetch all groups with their settings
   - [ ] For each group:
     - Select random game type from `enabled_games`
     - Generate prompt using `gamePrompts.ts` logic
     - Create `game_instance` record
     - Set `expires_at` to next day at notification time
   - [ ] Deploy function: `supabase functions deploy daily-game-generator`

2. **Cron Job Setup** (1 day)
   - [ ] Configure Supabase cron job to invoke function daily
   - [ ] Use group's `notification_time` and `timezone` settings
   - [ ] Add logging for debugging
   - [ ] Test with manual invocation

3. **Game Expiration Logic** (1 day)
   - [ ] Create function to mark games as 'expired' when `expires_at` passes
   - [ ] Show expired games differently in UI (greyed out, "Expired" badge)
   - [ ] Prevent responses/votes on expired games

4. **Manual Game Creation** (1 day)
   - [ ] Add admin option to manually trigger new game
   - [ ] Useful for testing and special occasions
   - [ ] Create `pages/games/[groupId]/new-game.vue`

**Deliverable:** Games automatically generate daily at configured time

---

### Phase 4: Push Notifications (Week 6)

**Goal:** Send notifications when new games are created

#### Tasks

1. **Capacitor Push Setup** (2 days)
   - [ ] Install `@capacitor/push-notifications`
   - [ ] Configure Android push (Firebase Cloud Messaging)
   - [ ] Configure iOS push (APNs)
   - [ ] Create composable: `composables/games/useGameNotifications.ts`
   - [ ] Request notification permissions on app open

2. **Store Device Tokens** (1 day)
   - [ ] Add `device_tokens` table:
     ```sql
     CREATE TABLE device_tokens (
       user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
       token TEXT NOT NULL,
       platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
       created_at TIMESTAMPTZ DEFAULT NOW(),
       PRIMARY KEY (user_id, token)
     );
     ```
   - [ ] Save token to database when granted

3. **Notification Edge Function** (2 days)
   - [ ] Create `supabase/functions/send-game-notifications/index.ts`
   - [ ] Fetch all members of a group
   - [ ] Get their device tokens
   - [ ] Send push via FCM/APNs
   - [ ] Payload: `{ title: "New Game!", body: "Would you rather...", data: { groupId, gameId } }`

4. **Integrate with Game Generator** (1 day)
   - [ ] Call notification function after creating game instance
   - [ ] Handle notification failures gracefully
   - [ ] Add user setting to disable notifications

**Deliverable:** Users receive push notifications for new games

---

### Phase 5: Additional Game Types (Weeks 7-8)

**Goal:** Implement 3 more game types

#### Game Type 2: "Guess Who Said It" (3 days)

- **Mechanics:**
  1. Prompt: "What's your unpopular opinion about [topic]?"
  2. All members submit anonymous text response
  3. Once all responses in, each member guesses who said what
  4. Reveal correct answers + scores

- **Tasks:**
  - [ ] Create `GuessWhoSaidIt.vue` component
  - [ ] Two phases: response submission, then guessing
  - [ ] Shuffle responses to anonymize
  - [ ] Score calculation: +1 point per correct guess
  - [ ] Show leaderboard

#### Game Type 3: "Most Likely To" (3 days)

- **Mechanics:**
  1. Prompt: "Who's most likely to [scenario]?"
  2. All members vote for one person in the group
  3. Show results: who got most votes

- **Tasks:**
  - [ ] Create `MostLikelyTo.vue` component
  - [ ] Display all group members as vote options
  - [ ] Handle ties (multiple people with same votes)
  - [ ] Fun UI: show member avatars with vote counts

#### Game Type 4: "Hot Take" (2 days)

- **Mechanics:**
  1. Prompt: Controversial statement (e.g., "Pineapple belongs on pizza")
  2. Members vote: Agree / Neutral / Disagree
  3. Show split with percentages

- **Tasks:**
  - [ ] Create `HotTake.vue` component
  - [ ] Three-option voting (agree/neutral/disagree)
  - [ ] Visual bar chart for results
  - [ ] Generate 50+ hot take prompts

**Deliverable:** 4 total game types, randomized daily

---

### Phase 6: Comments Integration (Week 9)

**Goal:** Add discussions to games using existing comment system

#### Tasks

1. **Thread Integration** (2 days)
   - [ ] Modify `composables/useThread.ts` to support `type: 'game_instance'`
   - [ ] Create thread automatically when game instance is created
   - [ ] Update RLS policies for game threads

2. **Add Comments to Game View** (2 days)
   - [ ] Import existing comment components
   - [ ] Add comment section below game results
   - [ ] Test thread loading and posting
   - [ ] Ensure proper permissions (only group members can comment)

3. **General Group Chat** (2 days)
   - [ ] Create thread type `'game_general'` for groups
   - [ ] Add `pages/games/[groupId]/chat.vue`
   - [ ] Reuse comment tree UI from vontests
   - [ ] Add tab navigation: Game | History | Chat | Members

**Deliverable:** Each game has comments, groups have general chat

---

### Phase 7: Polish & Mobile Optimization (Weeks 10-11)

**Goal:** Refine UI/UX, optimize for mobile, add animations

#### Tasks

1. **UI/UX Polish** (4 days)
   - [ ] Consistent color scheme for game types
   - [ ] Smooth transitions between game states
   - [ ] Loading skeletons for all async operations
   - [ ] Empty states: "No games yet", "No groups"
   - [ ] Error handling with toast notifications

2. **Mobile Optimization** (3 days)
   - [ ] Test on real iOS/Android devices
   - [ ] Optimize touch targets (min 44x44pt)
   - [ ] Add haptic feedback on votes/submissions
   - [ ] Test offline behavior (show cached data)
   - [ ] Optimize images (group avatars, user avatars)

3. **Animations** (2 days)
   - [ ] Result reveal animations (count up, fade in)
   - [ ] Confetti/celebration for completing games
   - [ ] Slide transitions between pages
   - [ ] Pull-to-refresh on game list

4. **Performance** (2 days)
   - [ ] Lazy load game history (pagination)
   - [ ] Optimize Supabase queries (select only needed fields)
   - [ ] Add loading states to prevent duplicate requests
   - [ ] Test with large groups (20+ members)

**Deliverable:** Polished, smooth mobile experience

---

### Phase 8: Testing & Deployment (Week 12)

**Goal:** Beta test with real users, fix bugs, deploy to stores

#### Tasks

1. **Beta Testing** (3 days)
   - [ ] Create 3-5 test groups with 5-10 real users
   - [ ] Run for 1 week, collect feedback
   - [ ] Monitor Supabase logs for errors
   - [ ] Fix critical bugs

2. **App Store Preparation** (2 days)
   - [ ] Create app icons (1024x1024 + all sizes)
   - [ ] Write app descriptions
   - [ ] Take screenshots for each game type
   - [ ] Set up App Store Connect + Google Play Console
   - [ ] Privacy policy + terms of service

3. **Final Build & Deploy** (2 days)
   - [ ] Build production bundles: `npm run build`
   - [ ] Build iOS app: `npx cap sync ios` + Xcode build
   - [ ] Build Android app: `npx cap sync android` + Gradle build
   - [ ] Submit to App Store (TestFlight first)
   - [ ] Submit to Google Play (internal testing track first)

**Deliverable:** Apps live in stores (beta or production)

---

## Part 4: Technical Considerations

### Supabase Edge Functions vs Nuxt Server API

**Decision:** Use Supabase Edge Functions for game generation and notifications

**Rationale:**
- Edge Functions are serverless, no need to deploy separate backend
- Can be invoked by cron jobs natively
- Easier to scale (Supabase handles infrastructure)
- Nuxt server API would require persistent hosting

### Real-time Updates Strategy

**Approach:** Use Supabase Realtime for live vote counts

```typescript
// In useGameVotes.ts
const subscribeToVotes = (gameInstanceId: string) => {
  return supabase
    .channel(`game:${gameInstanceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_votes',
        filter: `game_instance_id=eq.${gameInstanceId}`
      },
      (payload) => {
        // Update local vote count
        votes.value.push(payload.new)
      }
    )
    .subscribe()
}
```

### Offline Support

**Approach:** Use Capacitor Storage for basic caching

```typescript
import { Preferences } from '@capacitor/preferences'

// Cache last viewed game
await Preferences.set({
  key: 'lastGame',
  value: JSON.stringify(gameData)
})

// Retrieve on offline
const { value } = await Preferences.get({ key: 'lastGame' })
```

### Data Privacy

**Considerations:**
- All game data visible to group members (design decision)
- Optionally add "anonymous mode" for some games (e.g., "Guess Who Said It" hides authors until reveal)
- No external data sharing
- RLS policies enforce group boundaries

---

## Part 5: Effort Estimates

### By Phase

| Phase | Duration | Complexity | Risk Level |
|-------|----------|------------|------------|
| Phase 1: Groups | 2 weeks | Medium | Low |
| Phase 2: First Game | 2 weeks | Medium | Medium |
| Phase 3: Automation | 1 week | Medium-High | High |
| Phase 4: Notifications | 1 week | High | High |
| Phase 5: More Games | 2 weeks | Low-Medium | Low |
| Phase 6: Comments | 1 week | Low | Low |
| Phase 7: Polish | 2 weeks | Low | Low |
| Phase 8: Testing & Deploy | 1 week | Low | Medium |

**Total: 12 weeks** (can be shortened to 8 weeks with reduced game types or skipping Phase 7)

### By Role (if team-based)

| Role | Responsibility | Estimated Hours |
|------|---------------|-----------------|
| **Backend Dev** | Database schema, Edge Functions, RLS policies | 120 hours |
| **Frontend Dev** | Components, pages, composables | 200 hours |
| **Mobile Dev** | Capacitor integration, push setup, testing | 80 hours |
| **Designer** | UI/UX, animations, app store assets | 60 hours |
| **QA** | Testing, bug reports | 40 hours |

**Total: ~500 hours** (~3 months solo, ~1.5 months with 2 devs)

---

## Part 6: Risk Assessment

### High-Risk Items

1. **Push Notifications (Phase 4)**
   - **Risk:** Complex setup, platform-specific issues, certificate management
   - **Mitigation:** Start with web notifications first, delay mobile push if blocked
   - **Fallback:** In-app notifications only

2. **Cron Job Reliability (Phase 3)**
   - **Risk:** Supabase cron may fail, time zone handling complexity
   - **Mitigation:** Add monitoring, manual trigger option
   - **Fallback:** Users can manually request new game

3. **RLS Policy Complexity**
   - **Risk:** Leaking data across groups, performance issues
   - **Mitigation:** Extensive testing in Phase 1, use SQL EXPLAIN
   - **Fallback:** Simplify policies, add server-side checks

### Medium-Risk Items

1. **Real-time Subscriptions at Scale**
   - **Risk:** Supabase Realtime limits, latency
   - **Mitigation:** Test with 50+ concurrent users
   - **Fallback:** Poll every 5 seconds instead

2. **Game Prompt Quality**
   - **Risk:** Repetitive or boring prompts
   - **Mitigation:** Curate high-quality seed data (100+ prompts per game)
   - **Fallback:** Allow admins to submit custom prompts

---

## Part 7: Migration Strategy

### Coexistence with Vontests

**Option A: Monorepo (Recommended)**
- Current Vontests code stays as-is
- Add `/games` routes as new section
- Share auth, comments, UI components
- Deploy as one app with two "modes"

**Option B: Separate Apps**
- Clone repo, create `vontest-games`
- Copy shared code to `/shared` package
- Deploy separately
- Pros: Cleaner separation
- Cons: More maintenance, duplicate code

**Recommendation:** Go with Option A for faster MVP, refactor to Option B later if needed

### User Migration Path

1. Existing Vontests users can opt-in to games (new "Games" tab)
2. New users see both features
3. Eventually, measure usage and deprecate Vontests if games take off (or vice versa)

---

## Part 8: Success Metrics

### MVP Success Criteria

- [ ] 10+ groups created
- [ ] Average 3+ games played per group
- [ ] 80%+ member participation per game
- [ ] <5% error rate in Supabase logs
- [ ] Push notifications delivered 95%+ of the time
- [ ] <2 second page load time on mobile

### Long-term Metrics

- Daily Active Users (DAU)
- Games per group per week
- Average group size
- Retention: Day 7, Day 30
- Most popular game types

---

## Part 9: Next Steps

### Immediate Actions (This Week)

1. **Review and approve this plan**
   - Stakeholder sign-off
   - Adjust timeline if needed

2. **Set up development environment**
   - Create `feature/social-games` branch
   - Set up local Supabase instance for testing

3. **Start Phase 1**
   - Write migration files
   - Create `groups` table
   - Test RLS policies

### Long-term Roadmap (Post-MVP)

- **User-generated content:** Let groups create custom game prompts
- **Leaderboards:** Track points across all games
- **Achievements/badges:** "Played 30 days in a row", etc.
- **Cross-group challenges:** Public games anyone can join
- **Game modifiers:** Time limits, anonymous mode, etc.
- **Analytics dashboard:** Group activity insights

---

## Appendix A: Game Type Specifications

### 1. Would You Rather

**Prompt Structure:**
```json
{
  "question": "Would you rather...",
  "optionA": "have the ability to fly",
  "optionB": "have the ability to turn invisible"
}
```

**Response Structure:**
```json
{
  "choice": "A" | "B"
}
```

**Vote Structure:**
Uses `game_votes.voted_option` = "A" or "B"

---

### 2. Guess Who Said It

**Prompt Structure:**
```json
{
  "question": "What's your unpopular opinion about social media?"
}
```

**Response Structure (Phase 1 - Submission):**
```json
{
  "text": "User's opinion here",
  "phase": "submission"
}
```

**Response Structure (Phase 2 - Guessing):**
```json
{
  "guesses": {
    "response_id_1": "user_id_a",
    "response_id_2": "user_id_b",
    ...
  },
  "phase": "guessing"
}
```

**No votes needed** (uses responses for guesses)

---

### 3. Most Likely To

**Prompt Structure:**
```json
{
  "scenario": "Who's most likely to become famous?"
}
```

**Response Structure:**
Not used (direct voting)

**Vote Structure:**
Uses `game_votes.voted_for_user_id`

---

### 4. Hot Take

**Prompt Structure:**
```json
{
  "statement": "Pineapple belongs on pizza",
  "context": "Food" // optional category
}
```

**Response Structure:**
```json
{
  "stance": "agree" | "neutral" | "disagree"
}
```

**Vote Structure:**
Uses `game_votes.voted_option` = "agree", "neutral", or "disagree"

---

## Appendix B: Sample Prompts

### Would You Rather (20 examples)

1. Have the ability to fly OR have the ability to turn invisible?
2. Live in a world without music OR without movies?
3. Always have to say everything on your mind OR never speak again?
4. Be able to speak all languages OR be able to talk to animals?
5. Have a rewind button OR a pause button for your life?
6. Fight one horse-sized duck OR 100 duck-sized horses?
7. Have free Wi-Fi wherever you go OR free coffee where/whenever you want?
8. Be stuck on a broken ski lift OR in a broken elevator?
9. Have a personal chef OR a personal chauffeur?
10. Live without heating OR without air conditioning?
11. Be famous but always criticized OR unknown but always praised?
12. Time travel to the past OR to the future?
13. Have a photographic memory OR be able to forget anything you want?
14. Always be 10 minutes late OR 20 minutes early?
15. Win the lottery OR live twice as long?
16. Have an extra hour every day OR extra $100 every day?
17. Be able to read minds OR predict the future?
18. Have dinner with your favorite celebrity OR your favorite historical figure?
19. Give up social media OR give up streaming services?
20. Have unlimited battery life on all devices OR unlimited international phone service?

### Most Likely To (20 examples)

1. Who's most likely to become famous?
2. Who's most likely to survive a zombie apocalypse?
3. Who's most likely to win a reality TV show?
4. Who's most likely to become a millionaire?
5. Who's most likely to get arrested?
6. Who's most likely to fall asleep during a movie?
7. Who's most likely to cry during a sad movie?
8. Who's most likely to travel the world?
9. Who's most likely to become president?
10. Who's most likely to win an eating contest?
11. Who's most likely to get lost in their own neighborhood?
12. Who's most likely to prank someone?
13. Who's most likely to adopt 10 cats?
14. Who's most likely to go viral on social media?
15. Who's most likely to forget someone's birthday?
16. Who's most likely to become a superhero?
17. Who's most likely to win a dance competition?
18. Who's most likely to write a bestselling book?
19. Who's most likely to start a successful business?
20. Who's most likely to make everyone laugh?

### Hot Takes (20 examples)

1. Pineapple belongs on pizza
2. Cereal is a soup
3. Hot dogs are sandwiches
4. Die Hard is a Christmas movie
5. Toilet paper should hang over, not under
6. Ketchup belongs in the fridge
7. The book is always better than the movie
8. Cats are better than dogs
9. Summer is better than winter
10. Coffee is better than tea
11. Android is better than iPhone
12. Morning showers are better than night showers
13. You should put milk before cereal
14. Sleeping with socks on is normal
15. Ranch dressing goes on everything
16. Pancakes are better than waffles
17. The dress was blue and black (not gold and white)
18. You should respond to texts immediately
19. It's okay to eat pizza with a fork and knife
20. Everyone should learn to code

---

## Conclusion

This plan provides a concrete, step-by-step roadmap to build a social game platform while leveraging your existing Vontests infrastructure. The modular approach allows for iterative development, early testing, and flexibility to adjust based on user feedback.

**Key Takeaways:**
- ✅ 100% reuse of auth, comments, and UI framework
- 🔨 Build new groups, game instances, and simple voting from scratch
- ⚡ Automate with Edge Functions for daily games and notifications
- 📱 Optimize for mobile-first experience
- 🧪 MVP in 8-12 weeks with 4 game types

Good luck with the build! 🚀
