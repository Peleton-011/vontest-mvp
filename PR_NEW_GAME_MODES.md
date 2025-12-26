# PR: Fix and Enable Three New Game Modes + UI/UX Improvements

## Summary
This PR fixes critical database issues in three new game modes (Two Truths Roulette, Predict Your Friends, Compliment Economy), implements significant UI redesigns, and resolves console errors across the application.

## Game Modes Fixed and Enabled ✅

### 1. Two Truths Roulette ✅
**Status:** Fixed and enabled

**What was broken:**
- Database column mismatch (`game_id` → `game_instance_id`)
- Boring text input UI that didn't match the interactive game concept

**What was fixed:**
- ✅ Updated all database queries to use `game_instance_id`
- ✅ Complete UI redesign with interactive editable cards
- ✅ Click-to-edit cards with auto-focus inputs
- ✅ Visual distinction: green borders for truths (cards 1-2), red border for lie (card 3)
- ✅ Lie is always the 3rd card as per design requirements

**Files changed:**
- `composables/games/useTwoTruthsRoulette.ts` - Database fixes
- `components/games/TwoTruthsRouletteGame.vue` - Complete UI overhaul
- `types/games.ts` - Removed disabled/comingSoon flags

### 2. Predict Your Friends ✅
**Status:** Fixed and enabled

**What was broken:**
- Database column mismatch
- Oracle was not disclosed to players
- Unclear flow for Oracle selection vs prediction

**What was fixed:**
- ✅ Updated all database queries to use `game_instance_id`
- ✅ Oracle is now displayed prominently with avatar and name
- ✅ Different messaging for Oracle vs predictors
- ✅ Indigo-themed prominent card shows who the Oracle is
- ✅ Clear separation between prediction phase and Oracle answer phase
- ✅ Oracle selection flow for marking correct predictions

**Design decision:** User approved displaying the Oracle from the start for better gameplay experience

**Files changed:**
- `composables/games/usePredictYourFriends.ts` - Database fixes
- `components/games/PredictYourFriendsGame.vue` - Oracle disclosure UI
- `types/games.ts` - Removed disabled/comingSoon flags

### 3. Compliment Economy ✅
**Status:** Fixed and enabled

**What was broken:**
- Database column mismatch
- Bulk submission UX was confusing

**What was fixed:**
- ✅ Updated all database queries to use `game_instance_id`
- ✅ Implemented individual compliment submission flow (per user request)
- ✅ Added `addCompliment()` method with upsert pattern
- ✅ Real-time coin decrement after each submission
- ✅ Display of previously submitted compliments
- ✅ Form for adding ONE new compliment at a time

**UX improvement:** Each compliment is submitted separately with immediate feedback, making the experience more intentional and meaningful

**Files changed:**
- `composables/games/useComplimentEconomy.ts` - Individual submission logic
- `components/games/ComplimentEconomyGame.vue` - UI redesign
- `types/games.ts` - Removed disabled/comingSoon flags

## Console Errors Fixed 🐛

### 1. URadio Component Error
**Issue:** Bracket Battle form was using `URadio` component which doesn't exist in Nuxt UI v3

**Fix:** Replaced with `URadioGroup` using proper items array structure

**File:** `components/games/CreateGameForm.vue:446`

### 2. onUnmounted Lifecycle Warnings
**Issue:** All game components were registering `onUnmounted` hook inside `onMounted` callback after async operations, causing Vue lifecycle warnings

**Fix:** Moved `onUnmounted` hook registration to top level, stored channel refs at component level

**Files changed (8 components):**
- PredictYourFriendsGame.vue
- ComplimentEconomyGame.vue
- TwoTruthsRouletteGame.vue
- BracketBattleGame.vue
- DinnerPartyDilemmasGame.vue
- MostLikelyToGame.vue
- GuessWhoSaidItGame.vue
- HotTakesGame.vue

## Additional Improvements 🎨

### Profile & Group Features
- ✅ Fixed profile avatar not loading in navbar
- ✅ Improved group avatar upload functionality
- ✅ Filter disabled games from group configuration

### UI/UX Enhancements
- ✅ Replace browser confirm with UModal for game confirmation
- ✅ Add confirmation prompt before starting new game when one is active
- ✅ Show disabled games as 'Coming Soon' instead of hiding them

## Database Prompts Added 📝

Created SQL queries to add 50 sample prompts (10 each) for all new game modes:
- Two Truths Roulette (10 prompts)
- Predict Your Friends (10 prompts)
- Dinner Party Dilemmas (10 prompts)
- Compliment Economy (10 prompts)
- Bracket Battle (10 prompts)

**Note:** SQL queries provided separately, not yet executed in migrations

## Testing Checklist ✓

### Two Truths Roulette
- [ ] Create game from custom game form
- [ ] Submit two truths and a lie using interactive cards
- [ ] Verify card click-to-edit functionality
- [ ] Test voting phase
- [ ] Check results display

### Predict Your Friends
- [ ] Create game from custom game form
- [ ] Verify Oracle is displayed prominently
- [ ] Submit predictions as non-Oracle
- [ ] Submit answer as Oracle
- [ ] Oracle selects closest predictions
- [ ] Check results display

### Compliment Economy
- [ ] Create game from custom game form
- [ ] Submit individual compliments
- [ ] Verify coin decrement
- [ ] Check previously submitted compliments display
- [ ] Ensure form resets after submission

### Console
- [ ] No URadio warnings in console
- [ ] No onUnmounted lifecycle warnings
- [ ] HTTP 406 errors should still appear (these are expected)

## Breaking Changes
None - all changes are additive or fixes

## Migration Required?
No new migrations in this PR, but CHECK constraint needs to be verified/updated separately if creating Bracket Battle or Dinner Party Dilemmas games

## Files Changed
- 8 game component files (lifecycle fixes)
- 3 game composables (database fixes)
- 3 game components (UI redesigns)
- 1 form component (URadio fix)
- 1 types file (enable games)

## Commits
- Fix onUnmounted lifecycle warnings in all game components
- Fix URadio component error in Bracket Battle form
- Display Oracle prominently in Predict Your Friends game
- Fix Compliment Economy with individual submission flow
- Fix Predict Your Friends game with Oracle selection flow
- Fix Two Truths Roulette game and redesign UI with interactive cards
- Fix profile avatar not loading in navbar
- Filter disabled games from group configuration
- Change up group avatar input
- Replace browser confirm with UModal for game confirmation

## Screenshots/Demo
Request visual demos for:
1. Two Truths Roulette interactive card UI
2. Predict Your Friends Oracle disclosure
3. Compliment Economy individual submission flow

## Related Issues
Fixes issues documented in `GAME_ISSUES_ANALYSIS.md`:
- ✅ Database column mismatch (game_id → game_instance_id)
- ✅ URadio component issue
- ✅ Lifecycle hook warnings
