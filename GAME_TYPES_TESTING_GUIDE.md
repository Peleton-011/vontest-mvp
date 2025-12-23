# Game Types Testing Guide

This guide shows you how to test all four game types with the built-in testing functions.

## Prerequisites

Make sure you've run migrations 023-024:

```bash
npx supabase db push
```

This will:
- Add 10 prompts for each game type (Hot Takes, Guess Who Said It, Most Likely To)
- Create testing helper functions for each game type

## Quick Start

### View All Game Types Stats

```sql
SELECT * FROM view_game_types_stats();
```

Shows:
- How many prompts exist for each game type
- How many games have been created
- How many active games exist

### Test All Game Types at Once

```sql
-- Replace with your actual group UUID
SELECT test_all_game_types('YOUR_GROUP_UUID_HERE');
```

This creates one game of each type sequentially, leaving the last one (Most Likely To) active.

## Individual Game Type Testing

### 1. Would You Rather ✅ (Already Implemented)

```sql
-- Use the existing function
SELECT create_scheduled_game('GROUP_UUID');
```

**How it works:**
- Vote on two options (A or B)
- Rate intensity (1-10)
- See results showing vote breakdown and average intensity

### 2. Hot Takes 🔥

```sql
-- Create a test Hot Takes game
SELECT test_hot_takes_game('GROUP_UUID');
```

**How it works:**
- Present a controversial statement
- Players vote: Agree, Disagree, or Neutral
- Optionally explain their reasoning
- See breakdown of votes and top debaters (most reasoning)

**Test prompts include:**
- "Pineapple belongs on pizza"
- "Social media has done more harm than good"
- "Dogs are better pets than cats"

### 3. Guess Who Said It 🤔

```sql
-- Create a test Guess Who game
SELECT test_guess_who_game('GROUP_UUID');
```

**How it works:**
- **Phase 1 (Submission):** Everyone anonymously answers a question
- **Phase 2 (Guessing):** Try to match answers to people
- See who was the best guesser

**Test prompts include:**
- "What's your most embarrassing moment?"
- "If you could have any superpower, what would it be?"
- "What's your guilty pleasure?"

**Moving to Phase 2:**
```sql
-- After everyone has submitted answers
UPDATE game_instances
SET current_phase = 'guessing'
WHERE id = 'GAME_UUID';
```

### 4. Most Likely To 🏆

```sql
-- Create a test Most Likely To game
SELECT test_most_likely_to_game('GROUP_UUID');
```

**How it works:**
- Present a scenario
- Everyone votes for which group member fits it best
- You can vote for yourself!
- See winner and top 3

**Test prompts include:**
- "Most likely to become famous"
- "Most likely to survive a zombie apocalypse"
- "Most likely to become a millionaire"

## Viewing Prompts

### Get Random Prompts for a Game Type

```sql
-- Get 5 random Hot Takes prompts
SELECT * FROM get_random_prompts('hot_takes', 5);

-- Get 5 random Guess Who prompts
SELECT * FROM get_random_prompts('guess_who_said_it', 5);

-- Get 5 random Most Likely To prompts
SELECT * FROM get_random_prompts('most_likely_to', 5);
```

### See All Prompts for a Game Type

```sql
-- View all Hot Takes prompts
SELECT id, prompt_data, tags, usage_count
FROM game_prompts
WHERE game_type = 'hot_takes'
ORDER BY usage_count ASC;
```

## Composable Usage

Each game type has its own composable with similar patterns:

### Hot Takes Example

```vue
<script setup lang="ts">
const groupId = 'YOUR_GROUP_UUID';
const {
  loading,
  currentGame,
  userResponse,
  createGame,
  submitResponse,
  getActiveGame,
  getResults,
  completeGame
} = useHotTakes(groupId);

// Create a game
const handleCreateGame = async () => {
  const result = await createGame({
    statement: "Pineapple belongs on pizza"
  });
};

// Submit a response
const handleSubmit = async (stance: 'agree' | 'disagree' | 'neutral') => {
  await submitResponse(currentGame.value!.id, {
    stance,
    reasoning: "Because..." // Optional
  });
};
</script>
```

### Guess Who Said It Example

```vue
<script setup lang="ts">
const {
  loading,
  currentGame,
  submitAnswer,     // Phase 1: Submit anonymous answer
  submitGuesses,    // Phase 2: Submit guesses
  startGuessingPhase,
  getResults
} = useGuessWhoSaidIt(groupId);

// Phase 1: Submit anonymous answer
const handleSubmitAnswer = async () => {
  await submitAnswer(currentGame.value!.id, "My answer here");
};

// Move to guessing phase
const handleStartGuessing = async () => {
  await startGuessingPhase(currentGame.value!.id);
};

// Phase 2: Submit guesses
const handleSubmitGuesses = async (guesses: Record<string, string>) => {
  // guesses = { responseId: guessedUserId }
  await submitGuesses(currentGame.value!.id, guesses);
};
</script>
```

### Most Likely To Example

```vue
<script setup lang="ts">
const {
  loading,
  currentGame,
  submitVote,
  getResults
} = useMostLikelyTo(groupId);

// Vote for a group member
const handleVote = async (memberId: string) => {
  await submitVote(currentGame.value!.id, memberId);
};
</script>
```

## Game Type Differences

| Game Type | Phases | Response Type | Key Feature |
|-----------|--------|---------------|-------------|
| Would You Rather | Voting | Binary choice + intensity | Intensity rating (1-10) |
| Hot Takes | Voting | Agree/Disagree/Neutral | Optional reasoning text |
| Guess Who Said It | Submission → Guessing | Anonymous text answer | Two-phase gameplay |
| Most Likely To | Voting | Vote for group member | Member selection |

## Response Data Structures

### Would You Rather
```typescript
{
  choice: 'a' | 'b',
  intensity: number // 1-10
}
```

### Hot Takes
```typescript
{
  stance: 'agree' | 'disagree' | 'neutral',
  reasoning?: string // Optional
}
```

### Guess Who Said It
```typescript
{
  answer: string, // Phase 1
  guesses?: Record<string, string> // Phase 2: responseId -> guessedUserId
}
```

### Most Likely To
```typescript
{
  votedUserId: string // Who you're voting for
}
```

## Testing Workflow

1. **Create a game:**
   ```sql
   SELECT test_hot_takes_game('GROUP_UUID');
   ```

2. **View it in the UI:**
   - Go to `/games/GROUP_UUID`
   - Click "Games" tab
   - See the active game

3. **Test responses** (use composables in browser console or UI)

4. **View results:**
   ```sql
   SELECT * FROM game_instances WHERE group_id = 'GROUP_UUID' ORDER BY created_at DESC;
   ```

5. **Reset for next test:**
   ```sql
   SELECT clear_active_games('GROUP_UUID');
   ```

## Adding Custom Prompts

### Via SQL

```sql
INSERT INTO game_prompts (game_type, prompt_data, tags) VALUES
  ('hot_takes', '{"statement": "Your statement here"}', ARRAY['tag1', 'tag2']),
  ('guess_who_said_it', '{"question": "Your question here"}', ARRAY['tag1', 'tag2']),
  ('most_likely_to', '{"scenario": "Your scenario here"}', ARRAY['tag1', 'tag2']);
```

### Future: User-Created Prompts

Later we'll add:
- UI for group admins to add custom prompts
- Prompt voting/rating system
- Prompt categories and filtering
- Personal vs group-wide prompts

## Debugging

### Check Active Games
```sql
SELECT
  id,
  game_type,
  prompt,
  status,
  current_phase,
  created_at
FROM game_instances
WHERE group_id = 'GROUP_UUID'
  AND status = 'active'
ORDER BY created_at DESC;
```

### View Responses
```sql
SELECT
  gr.id,
  gr.user_id,
  p.username,
  gr.response_data,
  gr.created_at
FROM game_responses gr
JOIN profiles p ON p.id = gr.user_id
WHERE gr.game_instance_id = 'GAME_UUID'
ORDER BY gr.created_at;
```

### Game Stats by Type
```sql
SELECT
  game_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM game_instances
GROUP BY game_type;
```

## Next Steps

1. ✅ Test each game type with the helper functions
2. 🔜 Build UI components for each game type
3. 🔜 Add more prompts (100+ per game type)
4. 🔜 Implement user-created prompts feature
5. 🔜 Add prompt rating/favorites
6. 🔜 Build results visualization components

Happy testing! 🎮
