# Game System Architecture

This document explains the modular game system architecture and how to implement new games.

## Overview

The game system is designed to be:
- **Modular**: Each game has its own composable and component
- **Reusable**: Common functionality is shared via `useGameResults`
- **Integrated**: Game results automatically post to group chat
- **Type-safe**: Full TypeScript support throughout

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Group Chat (ChatSection)              │
│  - Displays all messages including game results │
└─────────────────────────────────────────────────┘
                       ▲
                       │ Posts results
                       │
┌─────────────────────────────────────────────────┐
│        useGameResults (Shared Composable)       │
│  - formatGameResultMessage()                    │
│  - postResultsToChat()                          │
│  - postGameAnnouncement()                       │
└─────────────────────────────────────────────────┘
                       ▲
                       │ Uses
                       │
┌─────────────────────────────────────────────────┐
│     useWouldYouRather (Game-Specific)           │
│  - createGame()                                 │
│  - submitResponse()                             │
│  - getResults()                                 │
│  - completeGame() → posts to chat               │
└─────────────────────────────────────────────────┘
                       ▲
                       │ Uses
                       │
┌─────────────────────────────────────────────────┐
│   WouldYouRatherGame.vue (UI Component)         │
│  - Game creation form                           │
│  - Response submission                          │
│  - Results display                              │
└─────────────────────────────────────────────────┘
```

## Database Schema

### game_instances
Stores all game instances across all types.

```sql
CREATE TABLE game_instances (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  game_type TEXT, -- 'would_you_rather', 'hot_takes', etc.
  prompt JSONB, -- Game-specific prompt data
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT, -- 'active', 'completed', 'expired'
  metadata JSONB, -- For storing results, stats, etc.
  current_phase TEXT, -- For multi-phase games
  phase_deadline TIMESTAMPTZ
);
```

### game_responses
Stores user responses to games.

```sql
CREATE TABLE game_responses (
  id UUID PRIMARY KEY,
  game_instance_id UUID REFERENCES game_instances(id),
  user_id UUID REFERENCES profiles(id),
  response_data JSONB, -- Game-specific response data
  created_at TIMESTAMPTZ
);
```

## Core Components

### 1. useGameResults (Shared)

Location: `composables/games/useGameResults.ts`

**Purpose**: Handles formatting and posting game results to group chat.

**Key Methods**:
- `formatGameResultMessage(result)` - Formats game-specific results into HTML
- `postResultsToChat(groupId, result)` - Posts formatted results to group chat
- `postGameAnnouncement(groupId, gameType, message)` - Posts simple announcements

**Usage**:
```typescript
const { postResultsToChat, postGameAnnouncement } = useGameResults();

// Post announcement when game starts
await postGameAnnouncement(groupId, 'would_you_rather', 'New game started!');

// Post results when game completes
await postResultsToChat(groupId, {
  gameInstanceId: gameId,
  gameType: 'would_you_rather',
  prompt: { option_a: '...', option_b: '...' },
  results: { votes: {...}, avg_intensity_a: 7.5, ... },
  participants: [...]
});
```

### 2. Game-Specific Composable (e.g., useWouldYouRather)

Location: `composables/games/useWouldYouRather.ts`

**Purpose**: Handles all game logic for a specific game type.

**Key Methods**:
- `createGame(prompt, expiresInHours)` - Creates new game instance
- `submitResponse(gameId, response)` - Submits user response
- `getActiveGame()` - Gets current active game for group
- `getUserResponse(gameId)` - Gets user's response to specific game
- `getResults(gameId)` - Calculates and returns game results
- `completeGame(gameId)` - Marks game complete and posts results to chat

**Structure**:
```typescript
export interface WouldYouRatherPrompt {
  option_a: string;
  option_b: string;
}

export interface WouldYouRatherResponse {
  choice: 'a' | 'b';
  intensity: number; // 1-10
}

export interface WouldYouRatherResults {
  votes: { option_a: number; option_b: number };
  avg_intensity_a: number;
  avg_intensity_b: number;
  responses: Array<{...}>;
}

export const useWouldYouRather = (groupId: string) => {
  // Implementation
  return {
    loading,
    error,
    currentGame,
    userResponse,
    createGame,
    submitResponse,
    getActiveGame,
    getUserResponse,
    getResults,
    completeGame,
  };
};
```

### 3. Game UI Component

Location: `components/games/WouldYouRatherGame.vue`

**Purpose**: Provides UI for creating, playing, and viewing results.

**Key Features**:
- Create game form (admins only)
- Display game prompt
- Response submission form
- Results visualization
- Automatic chat integration

## How to Implement a New Game

### Step 1: Define Types

Create interfaces for your game's prompt, response, and results.

```typescript
// In composables/games/useYourGame.ts
export interface YourGamePrompt {
  question: string;
  // ... other fields
}

export interface YourGameResponse {
  answer: string;
  // ... other fields
}

export interface YourGameResults {
  winner: string;
  // ... other fields
}
```

### Step 2: Create Game Composable

Create `composables/games/useYourGame.ts`:

```typescript
import type { Database } from '~/types/supabase';

export const useYourGame = (groupId: string) => {
  const supabase = useSupabaseClient<Database>();
  const user = useSupabaseUser();
  const { postResultsToChat, postGameAnnouncement } = useGameResults();

  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentGame = ref<GameInstance | null>(null);

  const createGame = async (prompt: YourGamePrompt) => {
    // 1. Insert into game_instances table
    // 2. Post announcement to chat
    // 3. Return success/error
  };

  const submitResponse = async (gameId: string, response: YourGameResponse) => {
    // 1. Check if user already responded
    // 2. Insert into game_responses table
    // 3. Update game metadata if needed
    // 4. Return success/error
  };

  const getResults = async (gameId: string): Promise<YourGameResults | null> => {
    // 1. Fetch game instance
    // 2. Fetch all responses
    // 3. Calculate results
    // 4. Return formatted results
  };

  const completeGame = async (gameId: string) => {
    // 1. Get results
    // 2. Mark game as completed
    // 3. Post results to chat using postResultsToChat()
    // 4. Return success/error
  };

  return {
    loading,
    error,
    currentGame,
    createGame,
    submitResponse,
    getResults,
    completeGame,
  };
};
```

### Step 3: Add Result Formatting

In `composables/games/useGameResults.ts`, add your game type to the switch statement:

```typescript
const formatGameResultMessage = (result: GameResult): string => {
  // ... existing code
  switch (gameType) {
    // ... existing cases
    case 'your_game':
      html += formatYourGameResults(prompt, results);
      break;
  }
  // ... rest of code
};

function formatYourGameResults(prompt: any, results: any): string {
  let html = '<div style="margin: 0.5em 0;">';
  // Format your game results here
  html += '</div>';
  return html;
}
```

### Step 4: Create UI Component

Create `components/games/YourGame.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  groupId: string;
}>();

const {
  loading,
  error,
  currentGame,
  createGame,
  submitResponse,
  getResults,
  completeGame,
} = useYourGame(props.groupId);

// Component logic here
</script>

<template>
  <!-- UI here -->
</template>
```

### Step 5: Export Composable

Add to `composables/index.ts`:

```typescript
export { useYourGame } from './games/useYourGame'
```

### Step 6: Add to Game Types

Update `types/games.ts`:

```typescript
export type GameType =
  | 'would_you_rather'
  | 'hot_takes'
  | 'your_game' // Add here
  // ... others
  ;

export const GAME_TYPES: Record<GameType, GameTypeMetadata> = {
  // ... existing games
  your_game: {
    id: 'your_game',
    name: 'Your Game',
    description: 'Description of your game',
    icon: 'i-heroicons-star',
    color: 'green',
    minPlayers: 2,
  },
};
```

## Example: Would You Rather

### Flow

1. **Admin creates game**:
   ```typescript
   const { createGame } = useWouldYouRather(groupId);
   await createGame({
     option_a: 'Have super strength',
     option_b: 'Have super speed'
   });
   ```
   - Creates game_instances row
   - Posts "New game started!" to chat

2. **Users submit responses**:
   ```typescript
   await submitResponse(gameId, {
     choice: 'a',
     intensity: 8
   });
   ```
   - Creates game_responses row
   - Updates vote counts in metadata

3. **Admin completes game**:
   ```typescript
   await completeGame(gameId);
   ```
   - Calculates results from all responses
   - Marks game as completed
   - Posts formatted results to chat

4. **Results appear in chat**:
   ```
   🎮 Game Results: Would You Rather

   Question:
   Have super strength vs Have super speed

   📊 Option A: 5 votes (avg intensity: 7.2)
   📊 Option B: 3 votes (avg intensity: 8.1)
   ```

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Validate user input** before submitting to database
3. **Check permissions** (is user a group member? is user an admin?)
4. **Handle edge cases** (no responses, ties, etc.)
5. **Use TypeScript** for type safety
6. **Format results nicely** in chat with emojis and clear structure
7. **Test with real users** to ensure UX is smooth

## Future Enhancements

- **Real-time updates**: Use Supabase Realtime for live game updates
- **Notifications**: Notify users when new games start
- **Leaderboards**: Track scores across all games
- **Game history**: View past games and results
- **Scheduled games**: Auto-create games based on group settings
- **Multi-phase games**: Support games with multiple rounds
- **Game variants**: Allow customization of game rules

## Troubleshooting

### Results not appearing in chat
- Check that game thread exists for group
- Verify `postResultsToChat()` is being called in `completeGame()`
- Check browser console for errors

### User can't submit response
- Verify user is a group member
- Check if user already responded
- Ensure game is in 'active' status

### Game not appearing
- Check `getActiveGame()` query
- Verify game_type matches exactly
- Check expires_at hasn't passed
