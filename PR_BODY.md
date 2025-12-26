# Fix and Enable Three New Game Modes + Console Error Fixes

## Summary
Fixes critical database issues and enables three new game modes: **Two Truths Roulette**, **Predict Your Friends**, and **Compliment Economy**. Also resolves console errors (URadio component, lifecycle warnings).

## Game Modes Fixed ✅

### ⭐ Two Truths Roulette
- ✅ Fixed database column mismatch (`game_id` → `game_instance_id`)
- ✅ Complete UI redesign with interactive click-to-edit cards
- ✅ Visual distinction with color-coded borders (green for truths, red for lie)
- ✅ Lie is always the 3rd card

**Demo:** Click cards to edit text inline, auto-focus on inputs

### 🔮 Predict Your Friends
- ✅ Fixed database column mismatch
- ✅ Oracle now displayed prominently with avatar and name
- ✅ Clear separation between prediction and Oracle answer phases
- ✅ Oracle selection flow for marking closest predictions

**Design decision:** Oracle is disclosed from the start for better gameplay

### 💝 Compliment Economy
- ✅ Fixed database column mismatch
- ✅ Individual compliment submission flow (instead of bulk)
- ✅ Real-time coin updates after each submission
- ✅ Display of previously submitted compliments

**UX improvement:** Each compliment submitted separately for more intentional experience

## Console Errors Fixed 🐛

### URadio Component Error
- ✅ Replaced with `URadioGroup` in Bracket Battle form
- ✅ Eliminates Vue component resolution warnings

### onUnmounted Lifecycle Warnings
- ✅ Fixed in 8 game components
- ✅ Moved hook registration to top level
- ✅ Proper channel cleanup on unmount

**Components fixed:**
- PredictYourFriendsGame.vue
- ComplimentEconomyGame.vue
- TwoTruthsRouletteGame.vue
- BracketBattleGame.vue
- DinnerPartyDilemmasGame.vue
- MostLikelyToGame.vue
- GuessWhoSaidItGame.vue
- HotTakesGame.vue

## Additional Improvements 🎨

- ✅ Profile avatar loading fixes
- ✅ Group avatar upload improvements
- ✅ Game confirmation modals (replaced browser confirm)
- ✅ Filter disabled games from group configuration
- ✅ Show disabled games as "Coming Soon"

## Files Changed

**Game Composables (Database Fixes):**
- `composables/games/useTwoTruthsRoulette.ts`
- `composables/games/usePredictYourFriends.ts`
- `composables/games/useComplimentEconomy.ts`

**Game Components (UI Redesigns + Lifecycle Fixes):**
- `components/games/TwoTruthsRouletteGame.vue` (complete redesign)
- `components/games/PredictYourFriendsGame.vue` (Oracle disclosure)
- `components/games/ComplimentEconomyGame.vue` (individual submission)
- `components/games/BracketBattleGame.vue` (lifecycle fix)
- `components/games/DinnerPartyDilemmasGame.vue` (lifecycle fix)
- `components/games/MostLikelyToGame.vue` (lifecycle fix)
- `components/games/GuessWhoSaidItGame.vue` (lifecycle fix)
- `components/games/HotTakesGame.vue` (lifecycle fix)

**Forms & UI:**
- `components/games/CreateGameForm.vue` (URadio → URadioGroup)
- `types/games.ts` (enabled 3 games)
- `components/Navbar.vue` (profile avatar fix)

## Testing Checklist

**Two Truths Roulette:**
- [ ] Create game from custom form
- [ ] Submit statements using interactive cards
- [ ] Verify card click-to-edit works
- [ ] Test voting phase
- [ ] Check results

**Predict Your Friends:**
- [ ] Create game from custom form
- [ ] Verify Oracle display is prominent
- [ ] Submit predictions as non-Oracle
- [ ] Submit answer as Oracle
- [ ] Oracle selects closest predictions
- [ ] Check results

**Compliment Economy:**
- [ ] Create game from custom form
- [ ] Submit individual compliments
- [ ] Verify coin decrement
- [ ] Check submitted compliments display
- [ ] Ensure form resets

**Console:**
- [ ] No URadio warnings
- [ ] No onUnmounted lifecycle warnings
- [ ] HTTP 406 errors still present (expected behavior)

## Breaking Changes
None - all changes are additive or fixes

## Still Disabled (Future Work)
- **Dinner Party Dilemmas** - Needs thorough testing
- **Bracket Battle** - Needs tournament flow testing

See `WHATS_NEXT.md` for roadmap

## Related Documents
- 📄 **Full PR Details:** `PR_NEW_GAME_MODES.md`
- 🗺️ **Future Roadmap:** `WHATS_NEXT.md`
- 🐛 **Issue Analysis:** `GAME_ISSUES_ANALYSIS.md`

## Database Work (Not Included)
SQL queries for 50 sample prompts provided separately. Will be added in follow-up migration.

---

**Ready to merge after testing ✅**
