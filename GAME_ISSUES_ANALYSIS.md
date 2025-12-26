# Analysis of New Game Mode Issues

## Executive Summary
All 5 new game modes (Two Truths Roulette, Predict Your Friends, Dinner Party Dilemmas, Compliment Economy, Bracket Battle Royale) are failing due to fundamental database schema mismatches and UI component issues. These games were implemented based on assumptions about the database structure that don't match the actual schema.

## Critical Issues

### 1. Database Schema Mismatch: `game_responses.game_id` Column

**Error:** `Could not find the 'game_id' column of 'game_responses' in the schema cache` / `column game_responses.game_id does not exist`

**Affected Games:** All 5 new games (Two Truths Roulette, Predict Your Friends, Dinner Party Dilemmas, Compliment Economy, Bracket Battle)

**Root Cause:**
The new game composables are attempting to insert records into the `game_responses` table using a `game_id` column:

```typescript
const { data, error: insertError } = await supabase
  .from('game_responses')
  .insert({
    game_id: gameId,  // ❌ This column doesn't exist
    user_id: user.value.id,
    response_data: submission,
  })
```

However, the actual database schema likely uses a different column name. Common possibilities:
- `instance_id`
- `game_instance_id`
- Or the relationship is structured entirely differently

**How to Fix:**
1. Inspect the actual `game_responses` table schema in Supabase
2. Check the existing working games (Would You Rather, Hot Takes, etc.) to see what column they use
3. Update all new game composables to use the correct column name
4. Alternatively, run a database migration to add/rename the column if needed

**Investigation Needed:**
- Run `SELECT * FROM information_schema.columns WHERE table_name = 'game_responses'` in Supabase SQL editor
- Check `useWouldYouRather.ts` or `useHotTakes.ts` to see the correct column structure they use

---

### 2. Game Type Constraint Violation: Bracket Battle

**Error:** `new row for relation "game_instances" violates check constraint "game_instances_game_type_check"`

**Affected Games:** Bracket Battle Royale (likely affects all new games if they were created)

**Root Cause:**
The `game_instances` table has a CHECK constraint on the `game_type` column that only allows specific enum values. When trying to create a game with `game_type: 'bracket_battle'`, the database rejects it because 'bracket_battle' is not in the allowed list.

**Database Schema Issue:**
```sql
-- Current constraint probably looks like:
ALTER TABLE game_instances
  ADD CONSTRAINT game_instances_game_type_check
  CHECK (game_type IN ('would_you_rather', 'hot_takes', 'guess_who_said_it', 'most_likely_to'));
  -- ❌ New game types are missing!
```

**How to Fix:**
1. Update the database CHECK constraint to include new game types:
```sql
ALTER TABLE game_instances
  DROP CONSTRAINT game_instances_game_type_check;

ALTER TABLE game_instances
  ADD CONSTRAINT game_instances_game_type_check
  CHECK (game_type IN (
    'would_you_rather',
    'hot_takes',
    'guess_who_said_it',
    'most_likely_to',
    'two_truths_roulette',
    'predict_your_friends',
    'dinner_party_dilemmas',
    'compliment_economy',
    'bracket_battle'
  ));
```

2. Or convert to an ENUM type if not already:
```sql
CREATE TYPE game_type_enum AS ENUM (
  'would_you_rather',
  'hot_takes',
  'guess_who_said_it',
  'most_likely_to',
  'two_truths_roulette',
  'predict_your_friends',
  'dinner_party_dilemmas',
  'compliment_economy',
  'bracket_battle'
);

ALTER TABLE game_instances
  ALTER COLUMN game_type TYPE game_type_enum USING game_type::game_type_enum;
```

**Investigation Needed:**
- Check current constraint: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'game_instances'::regclass;`
- Check if using ENUM: `SELECT typname, enumlabel FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'game_type';`

---

### 3. UI Component Issue: URadio Doesn't Exist

**Error:** Radio buttons not appearing in Bracket Battle form

**Affected Games:** Bracket Battle Royale

**Root Cause:**
Used `URadio` component which doesn't exist in Nuxt UI v3. The correct component is `URadioGroup`.

**Incorrect Code:**
```vue
<URadio
  v-model="bracketBattleForm.bracketSize"
  :value="8"
  label="8 competitors"
/>
<URadio
  v-model="bracketBattleForm.bracketSize"
  :value="16"
  label="16 competitors"
/>
```

**Correct Code:**
```vue
<URadioGroup
  v-model="bracketBattleForm.bracketSize"
  :items="[
    { value: 8, label: '8 competitors' },
    { value: 16, label: '16 competitors' }
  ]"
/>
```

**How to Fix:**
Replace all `URadio` usage with `URadioGroup` and proper items array structure.

---

### 4. Business Logic Issue: Dinner Party Guest List

**Error:** Only showing placeholder guests like "Guest from Famous Musicians #1" instead of actual guest options

**Affected Games:** Dinner Party Dilemmas

**Root Cause:**
The `createGame` function generates placeholder guests when no guests are provided:

```typescript
let guestOptions = prompt.options;
if (!guestOptions || guestOptions.length === 0) {
  const theme = prompt.theme || 'Famous People';
  guestOptions = [
    { id: '1', name: `Guest from ${theme} #1` },  // ❌ Placeholder!
    { id: '2', name: `Guest from ${theme} #2` },
    // ... etc
  ];
}
```

This was meant as temporary scaffolding but became the actual implementation.

**How to Fix - Option 1: Admin Provides Guests**
Modify the custom game form to allow admins to input actual guest names:

```typescript
const dinnerPartyDilemmasForm = reactive({
  theme: '',
  guests: [
    { id: '1', name: '' },
    { id: '2', name: '' },
    // ... up to 8 guests
  ]
});
```

**How to Fix - Option 2: AI-Generated Guests**
Integrate with an AI service to generate appropriate guests based on theme:

```typescript
// Call AI API
const response = await fetch('/api/generate-guests', {
  method: 'POST',
  body: JSON.stringify({ theme: 'Famous Musicians', count: 8 })
});
const guests = await response.json();
```

**How to Fix - Option 3: Pre-defined Guest Lists**
Create a database table with curated guest lists for common themes:

```sql
CREATE TABLE dinner_party_guests (
  id UUID PRIMARY KEY,
  theme TEXT,
  name TEXT,
  description TEXT,
  image_url TEXT
);
```

**Recommendation:** Option 1 is quickest for MVP. Option 3 is best for production.

---

### 5. Additional Issue: Individual vs. Bulk Submission

**User Request:** "I would also like to submit compliments individually and not in bulk"

**Current Implementation:**
Compliment Economy requires all compliments to be submitted together in a single transaction:

```typescript
const submitCompliments = async (gameId: string, submission: ComplimentSubmission) => {
  // submission.compliments is an array of ALL compliments
  const { data, error: insertError } = await supabase
    .from('game_responses')
    .insert({
      game_id: gameId,
      user_id: user.value.id,
      response_data: submission,  // All compliments at once
    })
```

**How to Support Individual Submission:**

**Option 1: Multiple Response Records**
Allow multiple `game_responses` entries per user per game:
```typescript
const submitCompliment = async (gameId: string, compliment: SingleCompliment) => {
  // Insert one compliment at a time
  await supabase.from('game_responses').insert({
    game_id: gameId,
    user_id: user.value.id,
    response_data: compliment,
  });
};
```

**Option 2: Partial Updates**
Allow updating existing response to add compliments incrementally:
```typescript
const addCompliment = async (gameId: string, newCompliment: SingleCompliment) => {
  // Fetch existing response
  const existing = await getUserResponse(gameId);
  const compliments = [...(existing?.response_data?.compliments || []), newCompliment];

  // Update with new compliment added
  await supabase.from('game_responses').upsert({
    game_id: gameId,
    user_id: user.value.id,
    response_data: { compliments }
  });
};
```

**Recommendation:** Option 2 maintains data integrity while allowing incremental submissions.

---

## Summary of Required Fixes

### Database Migrations Required:
1. ✅ Fix `game_responses` column name (investigate actual schema)
2. ✅ Add new game types to `game_instances.game_type` constraint/enum
3. ⚠️ Consider schema changes for individual compliment submission

### Code Fixes Required:
1. ✅ Update all new game composables to use correct `game_responses` column
2. ✅ Fix `URadio` → `URadioGroup` in Bracket Battle
3. ✅ Implement proper guest generation for Dinner Party Dilemmas
4. ⚠️ Add individual submission support for Compliment Economy

### Investigation Required:
1. Query actual `game_responses` table schema
2. Check existing working game composables for correct patterns
3. Verify game_type constraints in database
4. Review Supabase RLS policies for new game types

---

## Why These Issues Occurred

### 1. No Schema Validation
The games were implemented without first inspecting the actual database schema. Assumptions were made about column names and structure based on logical naming conventions rather than actual schema.

### 2. No Reference Implementation Review
While existing games (Would You Rather, etc.) were working, their implementation wasn't thoroughly reviewed before creating new ones. This led to reinventing patterns incorrectly.

### 3. No Database Migration Planning
New game types were added to TypeScript enums but the corresponding database constraints weren't updated. This is a common issue when the type system and database schema aren't kept in sync.

### 4. Component Library Version Mismatch
Used component syntax from different Nuxt UI version without checking current project's version and documentation.

### 5. Placeholder Code in Production
Temporary placeholder logic (like guest list generation) was left in the final implementation instead of being replaced with proper functionality.

---

## Recommended Development Process for Future Games

1. **Schema First Approach:**
   - Review existing database schema
   - Create migration scripts for new tables/columns/constraints
   - Run migrations in development environment
   - Test schema changes before implementing UI

2. **Pattern Matching:**
   - Identify working reference implementation
   - Copy its exact patterns for database operations
   - Only deviate when absolutely necessary

3. **Incremental Testing:**
   - Test database operations in isolation first
   - Verify CRUD operations work before building UI
   - Test with actual database, not just TypeScript types

4. **Component Library Documentation:**
   - Always check current version of UI library
   - Reference official documentation for component usage
   - Test components in isolation before integration

5. **Code Review Checklist:**
   - [ ] Database schema matches code expectations
   - [ ] All constraints/enums updated for new types
   - [ ] Component syntax matches library version
   - [ ] No placeholder/TODO code in production paths
   - [ ] Error handling for all database operations
   - [ ] RLS policies cover new game types

---

## Next Steps

1. **Disable all broken games** in UI forms and options
2. **Investigate database schema** to understand actual structure
3. **Create comprehensive migration plan** for schema updates
4. **Refactor games one at a time** using working patterns
5. **Test thoroughly** before re-enabling
