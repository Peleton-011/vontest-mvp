# Fix Custom Prompts Modal - Complete UI Implementation

## Summary
This PR fixes the completely broken ManagePromptsModal component by restructuring it to follow the working SimpleProposal pattern and implementing support for both emoji and image visuals simultaneously.

## Problem
The ManagePromptsModal had multiple critical issues:
1. Modal was "open all the time"
2. Tabs showed "empty modals"
3. Select dropdowns didn't work
4. Component architecture was fundamentally incorrect

## Solution

### 1. Restructured Component Architecture
- **Before**: Parent-controlled modal with v-model:open props/emits
- **After**: Self-contained component following SimpleProposal.vue pattern
  - Modal and trigger button in same component
  - Internal state management with `const open = ref(false)`
  - Parent just renders `<GamesManagePromptsModal :group-id="groupId" />`

### 2. Fixed Modal Structure
- **Before**: Used `<UCard>` with `#header` template slot inside modal
- **After**: Uses `#body` template slot directly on UModal with `title` prop
- Matches the working UModal pattern used throughout the codebase

### 3. Fixed Tab Configuration
- **Before**: Tabs used `key` property only
- **After**: Tabs use both `slot` and `value` properties
- Matches working tab pattern from parent page

### 4. Fixed Select Components
- **Before**: Used `USelectMenu` with `:options`, `option-attribute`, `value-attribute`
- **After**: Uses `USelect` with `:items` prop
- Matches working select pattern in games/new.vue and settings.vue

### 5. Removed Empty String Values
- **Before**: Visual options included `{ value: '', label: 'None' }`
- **After**: Removed empty value option (USelect doesn't allow empty strings)
- Added placeholders to indicate optional fields

### 6. Enhanced Visual Support
- **Before**: User had to choose between emoji OR image
- **After**: User can provide both emoji AND image simultaneously
  - Separate input fields for emoji and image
  - Data structure supports both: `{ emoji: '🎯', image: 'https://...' }`
  - Applied to all game types (Would You Rather, Hot Takes, Guess Who Said It, Most Likely To)

## Files Changed

### Core Component
- `components/games/ManagePromptsModal.vue` - Complete rewrite following SimpleProposal pattern

### Parent Integration
- `pages/games/[groupId]/index.vue` - Simplified to just render component without state management

## Testing Checklist
- [x] Modal opens when button clicked
- [x] Modal closes properly
- [x] Tabs switch between "Create" and "View"
- [x] Game type select works
- [x] Visual fields (emoji/image) work for all game types
- [x] Form validation works
- [x] Form submission creates custom prompts
- [x] Custom prompts list displays
- [x] Delete functionality works
- [x] Stats bar shows correct counts
- [x] Rate limiting displays correctly

## Key Commits
1. `7179023` - Completely rewrite ManagePromptsModal to follow SimpleProposal pattern
2. `6eade31` - Fix ManagePromptsModal structure to match UModal pattern
3. `ad1cff8` - Fix tab configuration in ManagePromptsModal
4. `03f51ae` - Fix select menus in ManagePromptsModal
5. `fb1d4f7` - Fix USelect empty value error in visual type options
6. `a4b6c03` - Support both emoji and image for prompt visuals

## Code Quality
- ✅ Follows existing codebase patterns (SimpleProposal)
- ✅ Uses consistent component naming
- ✅ Proper TypeScript types
- ✅ No console errors
- ✅ Clean commit history

## Breaking Changes
None - this is a fix for a non-functional component

## Migration Guide
No migration needed - component was not functional before this PR

## Related Work
- Part of custom group prompts feature (migration 030_custom_group_prompts.sql)
- Works with existing `useCustomPrompts` composable
- Integrates with existing prompt packages architecture

## Visual Changes

### Before
- Modal was always visible or broken
- Empty content in tabs
- Non-functional selects
- Had to choose emoji OR image

### After
- Clean modal that opens/closes correctly
- Working tabs with proper content
- Functional select dropdowns
- Can add both emoji AND image simultaneously

## Performance Impact
None - component was broken, now it works

## Security Considerations
- Uses existing RLS policies from migration 030
- Admin-only access enforced at database level
- Rate limiting (10 prompts/week) enforced by database function

## Documentation
- Component follows established SimpleProposal pattern
- Clear prop interface: just `groupId`
- Self-documenting with TypeScript types

## Future Enhancements
Possible future improvements (not in this PR):
- Image upload instead of URL input
- Emoji picker component
- Preview of how prompt will look in game
- Bulk import/export of prompts

---

## PR Metadata
- **Branch**: `claude/app-architecture-planning-39X1L`
- **Base**: `main`
- **Type**: Bug Fix
- **Priority**: High (blocking feature)
- **Reviewers**: Please test modal functionality end-to-end
