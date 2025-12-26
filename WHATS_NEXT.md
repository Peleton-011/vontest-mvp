# What's Next: Remaining Work & Future Enhancements

## 🚨 Critical - Still Broken (2 Game Modes)

### 1. Dinner Party Dilemmas
**Status:** Disabled (NOT WORKING)

**Known Issues:**
- ✅ Database column fixed (`game_instance_id` implemented)
- ⚠️ Needs thorough testing
- ⚠️ Complex voting/selection logic may have edge cases
- ⚠️ Multi-phase flow needs validation

**What needs to be done:**
1. **Test the full game flow:**
   - Create game with 8 guest options
   - Each player selects 3 guests + reasoning
   - Voting phase on whose party is best
   - Results calculation

2. **Verify database operations:**
   - Guest selection submission
   - Vote submissions
   - Results aggregation

3. **UI/UX validation:**
   - Guest selection cards
   - Reasoning input
   - Vote display
   - Results presentation

4. **Enable game:**
   - Remove `disabled: true` from `types/games.ts` line 132
   - Remove `comingSoon: true` from `types/games.ts` line 133

**Files to test:**
- `composables/games/useDinnerPartyDilemmas.ts`
- `components/games/DinnerPartyDilemmasGame.vue`

**Estimated effort:** 2-3 hours testing + fixes

---

### 2. Bracket Battle
**Status:** Disabled (NOT WORKING)

**Known Issues:**
- ✅ Database column fixed (`game_instance_id` implemented)
- ✅ URadio component fixed (using URadioGroup now)
- ⚠️ Complex multi-round tournament logic untested
- ⚠️ Bracket advancement/seeding needs validation
- ⚠️ Multi-day game flow needs testing

**What needs to be done:**
1. **Test tournament creation:**
   - 8-competitor bracket
   - 16-competitor bracket
   - Nomination phase
   - Seeding logic

2. **Test matchup flow:**
   - Round 1 voting
   - Winners advance to Round 2
   - Semi-finals
   - Finals
   - Champion declaration

3. **Verify multi-phase logic:**
   - Phase transitions (nomination → voting → next round)
   - Automatic phase changes when all votes are in
   - Results calculation per round

4. **UI/UX validation:**
   - Bracket visualization
   - Matchup voting cards
   - Progress tracking
   - Tournament results

5. **Enable game:**
   - Remove `disabled: true` from `types/games.ts` line 185
   - Remove `comingSoon: true` from `types/games.ts` line 186

**Files to test:**
- `composables/games/useBracketBattle.ts`
- `components/games/BracketBattleGame.vue`

**Estimated effort:** 4-6 hours (complex tournament logic)

---

## 📊 Database Work Needed

### 1. Add Sample Prompts to Database
**Status:** SQL queries written, NOT EXECUTED

**What needs to be done:**
1. Run the constraint update (adds new game types to CHECK):
   ```sql
   ALTER TABLE game_prompts DROP CONSTRAINT IF EXISTS game_prompts_game_type_check;
   ALTER TABLE game_prompts ADD CONSTRAINT game_prompts_game_type_check
     CHECK (game_type IN (...all 9 game types...));
   ```

2. Execute prompt insertion queries for:
   - Two Truths Roulette (10 prompts)
   - Predict Your Friends (10 prompts)
   - Dinner Party Dilemmas (10 prompts)
   - Compliment Economy (10 prompts)
   - Bracket Battle (10 prompts)

**Files:**
- SQL queries provided in chat response above
- Should be added to a new migration file

**Estimated effort:** 30 minutes

### 2. Verify Database Constraints
**What needs to be checked:**
1. `game_instances` table CHECK constraint includes all 9 game types
2. `game_prompts` table CHECK constraint includes all 9 game types
3. `create_scheduled_game()` function handles new game types
4. Default phases are set correctly for each game type

**Files to check:**
- `supabase/migrations/002_game_instances_core.sql`
- `supabase/migrations/015_game_scheduling.sql`
- `supabase/migrations/030_custom_group_prompts.sql`

**Estimated effort:** 1 hour

---

## 🎨 UI/UX Enhancements

### High Priority

#### 1. Would You Rather - Intensity Slider UX
**Current state:** Basic number input
**Desired state:** Visual slider with labels (1-10 scale)
**Estimated effort:** 1 hour

#### 2. Game Results - Better Visualizations
**Current state:** Basic text results
**Desired state:** Charts, graphs, visual comparisons
**Ideas:**
- Bar charts for vote distributions
- Percentage breakdowns
- User highlighting
**Estimated effort:** 3-4 hours

#### 3. Compliment Economy - Public Feed
**Current state:** Just submission and results
**Desired state:** Public feed of compliments with reactions
**Features:**
- Scrollable feed
- Reactions/likes
- Filter by recipient
**Estimated effort:** 4-5 hours

#### 4. Bracket Battle - Visual Bracket Display
**Current state:** List-based matchups (probably)
**Desired state:** Actual bracket tree visualization
**Features:**
- SVG bracket diagram
- Animated winner advancement
- Interactive matchup selection
**Estimated effort:** 6-8 hours (complex)

### Medium Priority

#### 5. Game History & Archives
**Feature:** View past completed games and their results
**Estimated effort:** 2-3 hours

#### 6. Player Stats Dashboard
**Feature:** Personal stats across all games (games played, win rate, participation)
**Estimated effort:** 3-4 hours

#### 7. Group Leaderboards
**Feature:** Group-wide rankings and achievements
**Estimated effort:** 4-5 hours

### Low Priority

#### 8. Game Notifications
**Feature:** Real-time notifications when:
- New game starts
- Phase changes
- Results are ready
**Estimated effort:** 3-4 hours

#### 9. Custom Game Themes
**Feature:** Groups can customize game colors/branding
**Estimated effort:** 2-3 hours

---

## 🧪 Testing & Quality

### Critical Testing Needed

1. **End-to-end game flows**
   - Complete game lifecycle for each mode
   - Multi-player testing
   - Edge cases (1 player, 100 players)
   - Concurrent games

2. **Performance testing**
   - Large groups (50+ members)
   - Many active games
   - Database query optimization

3. **Real-time sync testing**
   - Multiple users voting simultaneously
   - Phase transitions with active users
   - Connection drops/reconnects

**Estimated effort:** 8-10 hours

### Test Coverage

**Current state:** No automated tests
**Needed:**
- Unit tests for composables
- Integration tests for game flows
- E2E tests for critical paths

**Estimated effort:** 20-30 hours (comprehensive test suite)

---

## 🔧 Technical Debt

### Code Quality

1. **TypeScript Strictness**
   - Many `any` types in game composables
   - Need proper type definitions
   - **Effort:** 3-4 hours

2. **Error Handling**
   - Inconsistent error messages
   - Need user-friendly error displays
   - Need retry logic for failed operations
   - **Effort:** 4-5 hours

3. **Loading States**
   - Some components missing loading indicators
   - Need skeleton screens
   - **Effort:** 2-3 hours

4. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - ARIA labels
   - **Effort:** 6-8 hours

### Performance

1. **Query Optimization**
   - Some queries fetch unnecessary data
   - Could use query caching
   - **Effort:** 3-4 hours

2. **Component Optimization**
   - Could use `computed` instead of methods in some places
   - Memoization opportunities
   - **Effort:** 2-3 hours

3. **Bundle Size**
   - Could split game components
   - Lazy load game modes
   - **Effort:** 2-3 hours

---

## 🚀 Feature Enhancements

### New Game Mode Ideas

1. **Photo Caption Contest**
   - Admin posts photo
   - Everyone submits captions
   - Vote on funniest
   - **Effort:** 4-6 hours

2. **This or That** (simplified Would You Rather)
   - Quick binary choices
   - No intensity ratings
   - **Effort:** 2-3 hours

3. **Story Builder**
   - Collaborative story writing
   - Each person adds a sentence
   - **Effort:** 5-7 hours

4. **Debate Arena**
   - Structured 2-side debates
   - Timed rounds
   - **Effort:** 8-10 hours

### Social Features

1. **Player Profiles**
   - Game stats
   - Achievements/badges
   - Favorite games
   - **Effort:** 6-8 hours

2. **Group Discovery**
   - Public groups
   - Join requests
   - Group categories
   - **Effort:** 8-10 hours

3. **Friend System**
   - Add friends
   - DMs
   - Friend activity feed
   - **Effort:** 15-20 hours

---

## 📱 Mobile & Responsive

### Issues to Address

1. **Mobile Game UIs**
   - Some games cramped on mobile
   - Touch targets too small
   - **Effort:** 4-5 hours

2. **Responsive Layouts**
   - Better mobile navigation
   - Collapsible sidebars
   - **Effort:** 3-4 hours

3. **PWA Features**
   - Installable app
   - Offline support
   - Push notifications
   - **Effort:** 10-12 hours

---

## 🎯 Immediate Next Steps (Priority Order)

### Week 1: Stabilization
1. ✅ Test Dinner Party Dilemmas thoroughly (3 hours)
2. ✅ Test Bracket Battle thoroughly (6 hours)
3. ✅ Execute database prompt migrations (0.5 hours)
4. ✅ Fix any bugs found during testing (4-8 hours)
5. ✅ Enable both games if tests pass (5 minutes)

**Total: ~15-20 hours**

### Week 2: Polish & Testing
1. ✅ End-to-end testing all 9 game modes (8 hours)
2. ✅ Fix error handling and loading states (5 hours)
3. ✅ Improve game results visualizations (4 hours)
4. ✅ Add basic TypeScript type improvements (3 hours)

**Total: ~20 hours**

### Week 3: New Features
1. ✅ Implement Compliment Economy public feed (5 hours)
2. ✅ Add game history & archives (3 hours)
3. ✅ Create player stats dashboard (4 hours)
4. ✅ Mobile responsive improvements (4 hours)

**Total: ~16 hours**

### Week 4: Quality & Performance
1. ✅ Add automated tests for critical flows (10 hours)
2. ✅ Performance optimization (5 hours)
3. ✅ Accessibility improvements (6 hours)
4. ✅ Documentation updates (3 hours)

**Total: ~24 hours**

---

## 📋 Summary

### Immediate Blockers (Must Do)
- [ ] Test & enable Dinner Party Dilemmas
- [ ] Test & enable Bracket Battle
- [ ] Execute prompt migrations

### Short-term Goals (Next 2 weeks)
- [ ] All 9 games working and tested
- [ ] Better error handling
- [ ] Improved loading states
- [ ] Game results visualizations

### Long-term Vision (Next 1-2 months)
- [ ] Comprehensive test coverage
- [ ] Rich social features
- [ ] Mobile PWA
- [ ] Advanced analytics
- [ ] New game modes

### Technical Debt to Address
- [ ] TypeScript strictness
- [ ] Performance optimization
- [ ] Accessibility
- [ ] Code documentation

---

**Total estimated effort to complete all "Next Steps":** ~150-200 hours
**Estimated effort to MVP (all games working, tested, polished):** ~60-80 hours
