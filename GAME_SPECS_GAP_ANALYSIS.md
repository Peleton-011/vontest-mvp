# Game Specifications Gap Analysis

## Executive Summary

**Status: ⚠️ SIGNIFICANT REVISIONS NEEDED**

After analyzing your actual game requirements against the implementation plan, there are **major architectural gaps** that require substantial additions to the database schema, application logic, and feature set. However, the foundation is solid and the gaps are addressable.

**Good News:**
- ✅ Your games align **PERFECTLY** with Vontests' existing deliberation/discussion philosophy
- ✅ The core infrastructure (auth, comments, groups) remains fully reusable
- ✅ The discussion-heavy nature of your games makes the existing comment system even more valuable

**Challenges:**
- 🔴 Game complexity is 3-4x higher than planned (intensity scales, multi-phase games, tournaments)
- 🔴 Need scoring/points systems, leaderboards, analytics engine
- 🔴 Need debate matching algorithms and tournament management
- 🔴 Database schema requires significant expansion

---

## Part 1: Game-by-Game Comparison

### Game 1: Would You Rather

| Aspect | Your Requirements | My Plan | Gap |
|--------|------------------|---------|-----|
| **Voting** | Rank 1-10 intensity | Simple A/B choice | ❌ MAJOR - Need intensity scale |
| **Analytics** | Distribution curves, outlier detection | Simple vote counts | ❌ MAJOR - Need analytics engine |
| **Discussion** | Highlight/discuss outliers | General comments | ⚠️ MEDIUM - Need outlier-triggered threads |
| **Data viz** | Histograms, bell curves | Bar charts | ❌ MAJOR - Need advanced charting |

**Required Additions:**
```sql
-- Add to game_responses
ALTER TABLE game_responses ADD COLUMN intensity_score INTEGER CHECK (intensity_score BETWEEN 1 AND 10);

-- New table for analytics
CREATE TABLE game_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  analytics_type TEXT, -- 'distribution', 'outliers', 'consensus'
  data JSONB, -- Computed statistics
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Game 2: Hot Takes

| Aspect | Your Requirements | My Plan | Gap |
|--------|------------------|---------|-----|
| **Voting** | Agree/Disagree | Agree/Neutral/Disagree | ✅ CLOSE - Remove neutral option |
| **Debate Matching** | Auto-match strongest disagreers | None | ❌ CRITICAL - Need algorithm |
| **Leaderboard** | "Most convincing arguments" | None | ❌ MAJOR - Need scoring + leaderboard |
| **Mini debates** | Structured 1v1 debate threads | General comments | ⚠️ MEDIUM - Need debate thread type |

**Required Additions:**
```sql
-- New table for debate matches
CREATE TABLE debate_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  user_a_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id), -- Debate thread
  user_a_stance TEXT, -- 'agree' or 'disagree'
  user_b_stance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('active', 'completed')) DEFAULT 'active'
);

-- Add scoring to users per game
CREATE TABLE game_user_scores (
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  score_breakdown JSONB, -- {'convincing_votes': 5, 'participation': 2}
  PRIMARY KEY (game_instance_id, user_id)
);

-- Leaderboard view
CREATE TABLE game_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  game_type TEXT,
  timeframe TEXT, -- 'daily', 'weekly', 'all_time'
  rankings JSONB, -- Sorted array of {user_id, score, rank}
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Debate Matching Algorithm:**
```typescript
// In composables/games/useDebateMatching.ts
const matchDebaters = (gameInstanceId: string) => {
  // 1. Get all votes grouped by stance
  const agreeVoters = votes.filter(v => v.voted_option === 'agree')
  const disagreeVoters = votes.filter(v => v.voted_option === 'disagree')

  // 2. Match strongest opinions (highest intensity or most active)
  // Could use various strategies:
  // - Random pairing
  // - Most active users
  // - Users who haven't debated yet this week

  // 3. Create debate_match records
  // 4. Create dedicated thread for each match
  // 5. Notify matched users
}
```

---

### Game 3: Guess Who Said It

| Aspect | Your Requirements | My Plan | Gap |
|--------|------------------|---------|-----|
| **Phase 1** | Anonymous submissions | ✅ Planned | ✅ GOOD |
| **Phase 2** | Guessing who said what | ✅ Planned | ✅ GOOD |
| **Phase 3** | Reveal + discussion | Basic results | ⚠️ MINOR - Need reveal ceremony |
| **Anonymity** | Preserve until reveal | Assumed | ⚠️ MEDIUM - Need anonymization logic |

**Required Additions:**
```sql
-- Add phase tracking to game_instances
ALTER TABLE game_instances ADD COLUMN current_phase TEXT DEFAULT 'submission';
ALTER TABLE game_instances ADD COLUMN phase_deadline TIMESTAMPTZ;

-- Track phase transitions
CREATE TABLE game_phase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  phase TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

**Phase Management:**
```typescript
// In composables/games/useGamePhases.ts
const advancePhase = async (gameInstanceId: string) => {
  const game = await fetchGameInstance(gameInstanceId)

  switch (game.current_phase) {
    case 'submission':
      // Check if all members submitted
      // Move to 'guessing' phase
      // Notify members
      break
    case 'guessing':
      // Check if all members guessed
      // Move to 'reveal' phase
      // Calculate scores
      break
    case 'reveal':
      // Mark game as completed
      // Show leaderboard
      break
  }
}
```

---

### Game 4: Predict Your Friends

| Aspect | Your Requirements | My Plan | Gap |
|--------|------------------|---------|-----|
| **Core Mechanic** | Predictions about members | ❌ Not planned | ❌ CRITICAL - Entirely new |
| **Verification** | One person gives "true answer" | N/A | ❌ CRITICAL - Need verification system |
| **Scoring** | Points for accuracy | None | ❌ MAJOR - Need scoring logic |

**Required Additions:**
```sql
-- This is a completely new game type
CREATE TABLE prediction_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  predictor_id UUID REFERENCES profiles(id), -- Who made prediction
  predicted_user_id UUID REFERENCES profiles(id), -- Who they're predicting about
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track the "truth teller"
ALTER TABLE game_instances ADD COLUMN truth_teller_id UUID REFERENCES profiles(id);

-- Track correct predictions for scoring
CREATE TABLE prediction_accuracy (
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  predictor_id UUID REFERENCES profiles(id),
  was_correct BOOLEAN,
  points_earned INTEGER,
  PRIMARY KEY (game_instance_id, predictor_id)
);
```

---

### Game 5: Dinner Party Dilemmas

| Aspect | Your Requirements | My Plan | Gap |
|--------|------------------|---------|-----|
| **Selection** | Choose 3 of 8 with reasoning | N/A | ❌ CRITICAL - Not planned |
| **Reasoning** | Required explanations | Optional comments | ⚠️ MEDIUM - Need required field |
| **Voting** | Vote on best combo | Simple voting | ⚠️ MEDIUM - Need combo voting |

**Required Additions:**
```sql
-- Store multi-select choices
ALTER TABLE game_responses ADD COLUMN selected_options JSONB; -- Array of chosen IDs
ALTER TABLE game_responses ADD COLUMN reasoning TEXT NOT NULL; -- Required explanation

-- Vote on other users' selections
ALTER TABLE game_votes ADD COLUMN voted_for_response_id UUID REFERENCES game_responses(id);
```

---

### Game 6: Two Truths Roulette

| Aspect | Your Requirements | My Plan | Gap |
|--------|------------------|---------|-----|
| **Submission** | 2 truths + 1 lie | N/A | ❌ CRITICAL - Not planned |
| **Voting** | Guess the lie | N/A | ❌ CRITICAL - Need guess tracking |
| **Scoring** | Points for fooling others | None | ❌ MAJOR - Need scoring |

**Required Additions:**
```sql
-- Store truths/lies
CREATE TABLE truth_lie_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  statements JSONB NOT NULL, -- [{"text": "...", "is_lie": false}, ...]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track guesses
CREATE TABLE truth_lie_guesses (
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  guesser_id UUID REFERENCES profiles(id),
  target_submission_id UUID REFERENCES truth_lie_submissions(id),
  guessed_lie_index INTEGER, -- Which statement (0, 1, or 2) they think is the lie
  was_correct BOOLEAN,
  PRIMARY KEY (game_instance_id, guesser_id, target_submission_id)
);
```

---

### Game 7: The Compliment Economy

| Aspect | Your Requirements | My Plan | Gap |
|--------|------------------|---------|-----|
| **Resource Limit** | Limited "compliment coins" | N/A | ❌ CRITICAL - Need resource system |
| **Required Explanation** | Must explain compliment | Optional comments | ⚠️ MEDIUM - Need required field |
| **Leaderboard** | Most complimented | None | ❌ MAJOR - Need leaderboard |

**Required Additions:**
```sql
-- Track compliment economy
CREATE TABLE compliment_coins (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  coins_total INTEGER DEFAULT 5, -- Weekly allowance
  coins_remaining INTEGER DEFAULT 5,
  reset_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE compliments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  explanation TEXT NOT NULL, -- Required
  coins_spent INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly reset function (Edge Function or cron)
CREATE OR REPLACE FUNCTION reset_weekly_coins()
RETURNS void AS $$
BEGIN
  UPDATE compliment_coins
  SET coins_remaining = coins_total,
      reset_at = NOW() + INTERVAL '7 days'
  WHERE reset_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

### Game 8: Bracket Battle Royale

| Aspect | Your Requirements | My Plan | Gap |
|--------|------------------|---------|-----|
| **Tournament Structure** | Single-elimination brackets | N/A | ❌ CRITICAL - Not planned |
| **Debate per Matchup** | Discussion before each vote | General comments | ⚠️ MEDIUM - Need matchup threads |
| **Progressive Rounds** | Quarterfinals → Semifinals → Finals | Single-round voting | ❌ CRITICAL - Need bracket state machine |

**Required Additions:**
```sql
-- Tournament brackets
CREATE TABLE tournament_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  rounds JSONB NOT NULL, -- Array of rounds, each with matchups
  current_round INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual matchups
CREATE TABLE tournament_matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID REFERENCES tournament_brackets(id) ON DELETE CASCADE,
  round_number INTEGER,
  matchup_index INTEGER, -- Position in round
  option_a TEXT,
  option_b TEXT,
  thread_id UUID REFERENCES threads(id), -- Debate thread
  winner TEXT, -- 'option_a' or 'option_b'
  votes_a INTEGER DEFAULT 0,
  votes_b INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'active', 'completed')) DEFAULT 'pending'
);

-- Votes on matchups
CREATE TABLE tournament_votes (
  matchup_id UUID REFERENCES tournament_matchups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  voted_for TEXT, -- 'option_a' or 'option_b'
  PRIMARY KEY (matchup_id, user_id)
);
```

**Bracket State Machine:**
```typescript
// In utils/games/bracketLogic.ts

interface Bracket {
  rounds: Round[]
  currentRound: number
}

interface Round {
  matchups: Matchup[]
}

interface Matchup {
  optionA: string
  optionB: string
  winner?: string
}

const generateBracket = (options: string[]): Bracket => {
  // Must be power of 2 (4, 8, 16, etc.)
  const numOptions = options.length
  const numRounds = Math.log2(numOptions)

  const bracket: Bracket = {
    rounds: [],
    currentRound: 0
  }

  // Generate first round matchups
  for (let i = 0; i < numOptions; i += 2) {
    bracket.rounds[0].matchups.push({
      optionA: options[i],
      optionB: options[i + 1]
    })
  }

  return bracket
}

const advanceRound = (bracket: Bracket) => {
  const currentRound = bracket.rounds[bracket.currentRound]

  // Check all matchups have winners
  const allComplete = currentRound.matchups.every(m => m.winner)
  if (!allComplete) return

  // Generate next round from winners
  const winners = currentRound.matchups.map(m => m.winner!)
  const nextRound: Round = { matchups: [] }

  for (let i = 0; i < winners.length; i += 2) {
    nextRound.matchups.push({
      optionA: winners[i],
      optionB: winners[i + 1]
    })
  }

  bracket.rounds.push(nextRound)
  bracket.currentRound++
}
```

---

## Part 2: Critical Missing Features

### 1. Intensity/Ranking System

**Impact:** HIGH - Required for "Would You Rather: Ranked"

**Current State:** Simple A/B voting
**Needed:** 1-10 intensity scales with distribution analytics

**Implementation:**
```typescript
// In components/games/IntensitySlider.vue
<template>
  <div class="intensity-slider">
    <label>{{ option }}</label>
    <input
      type="range"
      min="1"
      max="10"
      v-model="intensity"
      @change="updateIntensity"
    />
    <span>{{ intensity }}/10</span>
  </div>
</template>

// In utils/games/analytics.ts
const calculateDistribution = (intensities: number[]) => {
  const distribution = Array(10).fill(0)
  intensities.forEach(i => distribution[i - 1]++)

  const mean = intensities.reduce((a, b) => a + b) / intensities.length
  const variance = intensities.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intensities.length
  const stdDev = Math.sqrt(variance)

  // Outlier detection (>2 standard deviations from mean)
  const outliers = intensities.filter(i => Math.abs(i - mean) > 2 * stdDev)

  return {
    distribution,
    mean,
    stdDev,
    outliers
  }
}
```

---

### 2. Debate Matching Algorithm

**Impact:** CRITICAL - Required for "Hot Takes"

**Current State:** None
**Needed:** Auto-match users with opposing views for mini-debates

**Algorithm Options:**

**Option A: Random Pairing**
```typescript
const matchDebaters = (agreeVoters: User[], disagreeVoters: User[]) => {
  const matches: Match[] = []
  const maxMatches = Math.min(agreeVoters.length, disagreeVoters.length, 3) // Limit to 3 debates

  // Shuffle and pair
  const shuffledAgree = shuffle(agreeVoters)
  const shuffledDisagree = shuffle(disagreeVoters)

  for (let i = 0; i < maxMatches; i++) {
    matches.push({
      userA: shuffledAgree[i],
      userB: shuffledDisagree[i],
      stance: 'oppose'
    })
  }

  return matches
}
```

**Option B: Intensity-Based Pairing** (Requires intensity voting)
```typescript
const matchDebaters = (votes: Vote[]) => {
  // Match strongest agree with strongest disagree
  const agreeByIntensity = votes
    .filter(v => v.voted_option === 'agree')
    .sort((a, b) => b.intensity - a.intensity)

  const disagreeByIntensity = votes
    .filter(v => v.voted_option === 'disagree')
    .sort((a, b) => b.intensity - a.intensity)

  // Pair top intensities
  return agreeByIntensity.slice(0, 3).map((agree, i) => ({
    userA: agree.user,
    userB: disagreeByIntensity[i].user,
    intensityDiff: agree.intensity + disagreeByIntensity[i].intensity
  }))
}
```

**Option C: Participation-Based** (Favor users who debate less)
```typescript
const matchDebaters = (votes: Vote[], pastDebates: DebateHistory[]) => {
  // Prioritize users who haven't debated recently
  const debateCounts = pastDebates.reduce((acc, d) => {
    acc[d.user_id] = (acc[d.user_id] || 0) + 1
    return acc
  }, {})

  const agreeVoters = votes
    .filter(v => v.voted_option === 'agree')
    .sort((a, b) => (debateCounts[a.user_id] || 0) - (debateCounts[b.user_id] || 0))

  // Similar for disagree, then pair
}
```

---

### 3. Leaderboards & Scoring System

**Impact:** CRITICAL - Required for multiple games

**Current State:** None
**Needed:** Points, rankings, time-based leaderboards

**Scoring Rules:**
```typescript
interface ScoringRules {
  participation: number // Just playing
  correct_guess: number // Guessing games
  convincing_argument: number // Debate upvotes
  fooled_others: number // Two Truths game
  accurate_prediction: number // Predict Your Friends
}

const DEFAULT_SCORING: ScoringRules = {
  participation: 1,
  correct_guess: 5,
  convincing_argument: 3,
  fooled_others: 2,
  accurate_prediction: 10
}

const calculateUserScore = (userId: string, gameInstanceId: string) => {
  let score = DEFAULT_SCORING.participation

  // Add game-specific scoring
  switch (gameType) {
    case 'guess_who_said_it':
      const correctGuesses = await getCorrectGuesses(userId, gameInstanceId)
      score += correctGuesses * DEFAULT_SCORING.correct_guess
      break

    case 'hot_takes':
      const upvotesOnArguments = await getDebateUpvotes(userId, gameInstanceId)
      score += upvotesOnArguments * DEFAULT_SCORING.convincing_argument
      break

    // etc.
  }

  return score
}
```

**Leaderboard View:**
```vue
<template>
  <div class="leaderboard">
    <h3>{{ timeframe }} Leaderboard</h3>
    <div v-for="(entry, index) in rankings" :key="entry.user_id" class="rank-entry">
      <span class="rank">{{ index + 1 }}</span>
      <UserAvatar :user-id="entry.user_id" />
      <span class="username">{{ entry.username }}</span>
      <span class="score">{{ entry.score }} pts</span>
    </div>
  </div>
</template>
```

---

### 4. Multi-Phase Game Management

**Impact:** HIGH - Required for "Guess Who Said It", "Two Truths Roulette"

**Current State:** Single-phase games
**Needed:** State machine for phase transitions

**Phase State Machine:**
```typescript
type GamePhase = 'submission' | 'waiting' | 'guessing' | 'reveal' | 'completed'

interface PhaseConfig {
  name: GamePhase
  nextPhase: GamePhase | null
  requiredCondition: (game: GameInstance) => boolean
  onEnter: (game: GameInstance) => Promise<void>
  onExit: (game: GameInstance) => Promise<void>
}

const PHASE_CONFIGS: Record<string, PhaseConfig[]> = {
  'guess_who_said_it': [
    {
      name: 'submission',
      nextPhase: 'waiting',
      requiredCondition: (game) => allMembersSubmitted(game),
      onEnter: async (game) => {
        await notifyMembers(game, 'Submit your anonymous opinion')
      },
      onExit: async (game) => {
        await anonymizeResponses(game)
      }
    },
    {
      name: 'waiting',
      nextPhase: 'guessing',
      requiredCondition: (game) => true, // Auto-advance after anonymization
      onEnter: async (game) => {
        await shuffleResponses(game)
      },
      onExit: async (game) => {}
    },
    {
      name: 'guessing',
      nextPhase: 'reveal',
      requiredCondition: (game) => allMembersGuessed(game),
      onEnter: async (game) => {
        await notifyMembers(game, 'Guess who said what!')
      },
      onExit: async (game) => {
        await calculateGuessScores(game)
      }
    },
    {
      name: 'reveal',
      nextPhase: 'completed',
      requiredCondition: (game) => true,
      onEnter: async (game) => {
        await revealAuthors(game)
        await createResultsThread(game)
      },
      onExit: async (game) => {
        await markGameComplete(game)
      }
    }
  ]
}

// Phase transition logic
const tryAdvancePhase = async (gameInstanceId: string) => {
  const game = await fetchGameInstance(gameInstanceId)
  const phaseConfig = PHASE_CONFIGS[game.game_type].find(p => p.name === game.current_phase)

  if (!phaseConfig) return

  // Check if conditions met
  if (!phaseConfig.requiredCondition(game)) {
    console.log(`Phase ${game.current_phase} conditions not met`)
    return
  }

  // Exit current phase
  await phaseConfig.onExit(game)

  // Move to next phase
  if (phaseConfig.nextPhase) {
    await updateGamePhase(gameInstanceId, phaseConfig.nextPhase)
    const nextConfig = PHASE_CONFIGS[game.game_type].find(p => p.name === phaseConfig.nextPhase)
    await nextConfig?.onEnter(game)
  }
}
```

---

### 5. Required Reasoning/Explanation Fields

**Impact:** MEDIUM - Required for "Dinner Party Dilemmas", "Compliment Economy"

**Current State:** Optional comments
**Needed:** Required text fields with validation

**Implementation:**
```typescript
// In composables/games/useGameResponses.ts
const submitResponse = async (gameInstanceId: string, responseData: any) => {
  // Validate required reasoning based on game type
  if (requiresReasoning(gameType) && !responseData.reasoning) {
    throw new Error('Reasoning is required for this game')
  }

  if (responseData.reasoning && responseData.reasoning.length < 20) {
    throw new Error('Please provide at least 20 characters of reasoning')
  }

  // Submit
}

// In components
<FormField
  label="Why did you choose these three?"
  v-model="reasoning"
  :required="true"
  :min-length="20"
  placeholder="Explain your choices..."
/>
```

---

### 6. Tournament/Bracket System

**Impact:** CRITICAL - Required for "Bracket Battle Royale"

**Current State:** None
**Needed:** Full tournament management system

**This is a major feature that requires:**
- Bracket generation algorithm
- Round-by-round voting
- Thread per matchup
- Winner advancement logic
- Final champion ceremony

(See Game 8 section above for detailed implementation)

---

## Part 3: Revised Database Schema

Here's the **complete revised schema** incorporating all games:

```sql
-- ==========================================
-- EXISTING TABLES (from original plan)
-- ==========================================

-- groups, group_members, group_invitations
-- game_instances, game_responses, game_votes
-- (Keep all from original plan)

-- ==========================================
-- NEW TABLES FOR ENHANCED FEATURES
-- ==========================================

-- 1. INTENSITY & ANALYTICS
ALTER TABLE game_responses ADD COLUMN intensity_score INTEGER CHECK (intensity_score BETWEEN 1 AND 10);

CREATE TABLE game_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  analytics_type TEXT NOT NULL, -- 'distribution', 'outliers', 'consensus'
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DEBATE MATCHING
CREATE TABLE debate_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  user_a_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id),
  user_a_stance TEXT,
  user_b_stance TEXT,
  winner_id UUID REFERENCES profiles(id), -- Voted by group
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('active', 'completed')) DEFAULT 'active'
);

-- 3. SCORING & LEADERBOARDS
CREATE TABLE game_user_scores (
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (game_instance_id, user_id)
);

CREATE TABLE game_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  game_type TEXT,
  timeframe TEXT CHECK (timeframe IN ('daily', 'weekly', 'monthly', 'all_time')),
  rankings JSONB NOT NULL, -- [{user_id, score, rank}]
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, game_type, timeframe)
);

-- 4. PHASE MANAGEMENT
ALTER TABLE game_instances ADD COLUMN current_phase TEXT DEFAULT 'submission';
ALTER TABLE game_instances ADD COLUMN phase_deadline TIMESTAMPTZ;

CREATE TABLE game_phase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 5. PREDICTION GAMES
CREATE TABLE prediction_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  predictor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  predicted_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_instance_id, predictor_id) -- One prediction per user
);

ALTER TABLE game_instances ADD COLUMN truth_teller_id UUID REFERENCES profiles(id);

-- 6. TWO TRUTHS ROULETTE
CREATE TABLE truth_lie_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  statements JSONB NOT NULL, -- [{"text": "...", "is_lie": false}, ...]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_instance_id, user_id)
);

CREATE TABLE truth_lie_guesses (
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  guesser_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_submission_id UUID REFERENCES truth_lie_submissions(id) ON DELETE CASCADE,
  guessed_lie_index INTEGER CHECK (guessed_lie_index IN (0, 1, 2)),
  was_correct BOOLEAN,
  PRIMARY KEY (game_instance_id, guesser_id, target_submission_id)
);

-- 7. COMPLIMENT ECONOMY
CREATE TABLE compliment_coins (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  coins_total INTEGER DEFAULT 5,
  coins_remaining INTEGER DEFAULT 5,
  reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE compliments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  explanation TEXT NOT NULL CHECK (length(explanation) >= 20),
  coins_spent INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TOURNAMENT BRACKETS
CREATE TABLE tournament_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
  rounds JSONB NOT NULL, -- Array of rounds
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID REFERENCES tournament_brackets(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  matchup_index INTEGER NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  thread_id UUID REFERENCES threads(id),
  winner TEXT, -- 'option_a' or 'option_b'
  votes_a INTEGER DEFAULT 0,
  votes_b INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'active', 'completed')) DEFAULT 'pending',
  UNIQUE(bracket_id, round_number, matchup_index)
);

CREATE TABLE tournament_votes (
  matchup_id UUID REFERENCES tournament_matchups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  voted_for TEXT CHECK (voted_for IN ('option_a', 'option_b')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (matchup_id, user_id)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX idx_game_analytics_instance ON game_analytics(game_instance_id);
CREATE INDEX idx_debate_matches_game ON debate_matches(game_instance_id);
CREATE INDEX idx_game_user_scores_lookup ON game_user_scores(user_id, game_instance_id);
CREATE INDEX idx_leaderboards_group_type ON game_leaderboards(group_id, game_type, timeframe);
CREATE INDEX idx_phase_history_game ON game_phase_history(game_instance_id);
CREATE INDEX idx_compliments_recipient ON compliments(to_user_id, group_id);
CREATE INDEX idx_tournament_matchups_bracket ON tournament_matchups(bracket_id, round_number);

-- ==========================================
-- RLS POLICIES (extend existing)
-- ==========================================

-- All new tables need RLS policies following same pattern as original plan
-- (Members can view/interact with group games)
```

---

## Part 4: Revised Architecture

### Updated File Structure

```
vontest-mvp/
├── composables/
│   ├── games/
│   │   ├── useGroups.ts                 # ✅ Original
│   │   ├── useGameInstances.ts          # ✅ Original
│   │   ├── useGameResponses.ts          # ⚠️ EXPAND - Add intensity
│   │   ├── useGameVotes.ts              # ✅ Original
│   │   ├── useGamePhases.ts             # 🔴 NEW - Phase management
│   │   ├── useDebateMatching.ts         # 🔴 NEW - Match debaters
│   │   ├── useGameScoring.ts            # 🔴 NEW - Calculate scores
│   │   ├── useLeaderboards.ts           # 🔴 NEW - Rankings
│   │   ├── useTournaments.ts            # 🔴 NEW - Bracket logic
│   │   ├── useComplimentEconomy.ts      # 🔴 NEW - Coin system
│   │   └── useGameAnalytics.ts          # 🔴 NEW - Distribution curves
│
├── components/
│   ├── games/
│   │   ├── game-types/
│   │   │   ├── WouldYouRatherRanked.vue      # ⚠️ REVISED - Add intensity
│   │   │   ├── HotTakes.vue                  # ⚠️ REVISED - Add debate matching
│   │   │   ├── GuessWhoSaidIt.vue            # ⚠️ REVISED - Multi-phase
│   │   │   ├── PredictYourFriends.vue        # 🔴 NEW
│   │   │   ├── DinnerPartyDilemmas.vue       # 🔴 NEW
│   │   │   ├── TwoTruthsRoulette.vue         # 🔴 NEW
│   │   │   ├── ComplimentEconomy.vue         # 🔴 NEW
│   │   │   └── BracketBattleRoyale.vue       # 🔴 NEW
│   │   ├── IntensitySlider.vue               # 🔴 NEW
│   │   ├── DistributionChart.vue             # 🔴 NEW
│   │   ├── DebateCard.vue                    # 🔴 NEW
│   │   ├── Leaderboard.vue                   # 🔴 NEW
│   │   ├── PhaseIndicator.vue                # 🔴 NEW
│   │   ├── TournamentBracketView.vue         # 🔴 NEW
│   │   └── ComplimentForm.vue                # 🔴 NEW
│
├── utils/
│   └── games/
│       ├── analytics.ts                      # 🔴 NEW - Distribution calc
│       ├── debateMatching.ts                 # 🔴 NEW - Matching algorithms
│       ├── bracketLogic.ts                   # 🔴 NEW - Tournament generation
│       ├── scoringRules.ts                   # 🔴 NEW - Point calculations
│       └── phaseStateMachine.ts              # 🔴 NEW - Phase transitions
│
├── supabase/
│   ├── functions/
│   │   ├── daily-game-generator/             # ⚠️ EXPAND - Handle all game types
│   │   ├── advance-game-phases/              # 🔴 NEW - Auto-advance phases
│   │   ├── match-debaters/                   # 🔴 NEW - Create debate matches
│   │   ├── calculate-leaderboards/           # 🔴 NEW - Update rankings
│   │   └── reset-compliment-coins/           # 🔴 NEW - Weekly reset
│   │
│   └── migrations/
│       ├── 20250101_add_groups.sql
│       ├── 20250102_add_game_instances.sql
│       ├── 20250103_add_intensity_analytics.sql  # 🔴 NEW
│       ├── 20250104_add_debate_matching.sql      # 🔴 NEW
│       ├── 20250105_add_scoring_leaderboards.sql # 🔴 NEW
│       ├── 20250106_add_phase_management.sql     # 🔴 NEW
│       ├── 20250107_add_predictions.sql          # 🔴 NEW
│       ├── 20250108_add_two_truths.sql           # 🔴 NEW
│       ├── 20250109_add_compliments.sql          # 🔴 NEW
│       └── 20250110_add_tournaments.sql          # 🔴 NEW
```

---

## Part 5: Revised Implementation Timeline

### Original Plan: 12 weeks
### Revised Plan: 20-24 weeks (almost 2x longer)

| Phase | Original | Revised | Reason for Change |
|-------|----------|---------|-------------------|
| Phase 1: Groups | 2 weeks | 2 weeks | ✅ No change |
| Phase 2: First Game | 2 weeks | 4 weeks | Added intensity, analytics |
| Phase 3: Automation | 1 week | 2 weeks | More complex game types |
| Phase 4: Notifications | 1 week | 1 week | ✅ No change |
| **Phase 5: Game Types** | **2 weeks** | **8 weeks** | **8 games vs 3 games** |
| **Phase 6: Advanced Features** | **N/A** | **3 weeks** | **Scoring, leaderboards, debates** |
| Phase 7: Comments | 1 week | 1 week | ✅ No change |
| Phase 8: Polish | 2 weeks | 2 weeks | ✅ No change |
| Phase 9: Testing | 1 week | 1 week | ✅ No change |
| **TOTAL** | **12 weeks** | **24 weeks** | **+12 weeks (+100%)** |

### Revised Phase Breakdown

**Phase 5 (Game Types) - Now 8 weeks:**
- Week 1-2: Would You Rather Ranked (intensity + analytics)
- Week 3: Hot Takes (debate matching)
- Week 4: Guess Who Said It (multi-phase)
- Week 5: Predict Your Friends
- Week 6: Two Truths Roulette
- Week 7: Dinner Party Dilemmas / Compliment Economy
- Week 8: Bracket Battle Royale (most complex)

**Phase 6 (Advanced Features) - NEW 3 weeks:**
- Week 1: Scoring system + leaderboards
- Week 2: Debate matching algorithms
- Week 3: Tournament bracket system

---

## Part 6: Effort Re-Estimate

### Original: ~500 hours
### Revised: ~900 hours (+80%)

| Component | Original | Revised | Difference |
|-----------|----------|---------|------------|
| Database Schema | 40h | 80h | +40h (2x tables) |
| Backend Logic | 80h | 160h | +80h (complex algorithms) |
| Frontend Components | 200h | 320h | +120h (8 games vs 4) |
| Game Logic | 60h | 140h | +80h (phases, scoring) |
| Edge Functions | 40h | 60h | +20h (more functions) |
| Testing | 40h | 80h | +40h (more features) |
| Polish | 40h | 60h | +20h (more UI) |
| **TOTAL** | **500h** | **900h** | **+400h** |

**Revised Team Estimates:**
- Solo developer: 5-6 months (was 3 months)
- 2 developers: 2.5-3 months (was 1.5 months)
- 3 developers: 2 months (was 1 month)

---

## Part 7: Risk Assessment (UPDATED)

### New High-Risk Items

1. **Debate Matching Algorithm** (NEW)
   - **Risk:** Complex logic, potential for unfair matches
   - **Mitigation:** Start with simple random pairing, iterate based on feedback
   - **Fallback:** Manual debate opt-in instead of auto-matching

2. **Multi-Phase Game State Management** (NEW)
   - **Risk:** Race conditions, state desync between users
   - **Mitigation:** Use Supabase Realtime for phase sync, optimistic UI updates
   - **Fallback:** Reload on phase change instead of real-time

3. **Tournament Bracket Complexity** (NEW)
   - **Risk:** Hardest game to implement, many edge cases
   - **Mitigation:** Delay to Phase 5 week 8, use battle-tested algorithm
   - **Fallback:** Start with 4-option brackets only, expand later

4. **Scoring & Leaderboard Accuracy** (NEW)
   - **Risk:** Wrong calculations damage trust
   - **Mitigation:** Extensive unit tests, manual verification in beta
   - **Fallback:** Simple participation-based scoring only

### Medium-Risk Items (Promoted from Low)

1. **Analytics Engine** (was not considered)
   - **Risk:** Performance issues with distribution calculations at scale
   - **Mitigation:** Pre-compute on vote, cache results
   - **Fallback:** Simple vote counts without fancy analytics

2. **Phase Deadline Management** (NEW)
   - **Risk:** Edge Function timing issues, timezone confusion
   - **Mitigation:** Use group timezone setting, add manual override
   - **Fallback:** No auto-advance, require manual phase trigger

---

## Part 8: Key Recommendations

### What to Do IMMEDIATELY

1. **✅ Accept this revised plan** - The complexity is real but manageable
2. **✅ Prioritize Phase 1-3** - Get groups + one simple game working first
3. **⚠️ Cut scope initially** - Launch with 3-4 games, add rest post-MVP
4. **⚠️ Focus on discussion** - This aligns perfectly with your Vontests strength

### Suggested MVP Scope (3 months instead of 6)

**Launch with these 4 games:**
1. ✅ **Would You Rather Ranked** - Core intensity mechanic
2. ✅ **Hot Takes** - Core debate mechanic
3. ✅ **Guess Who Said It** - Core multi-phase mechanic
4. ✅ **Most Likely To** - Simple fun game

**Delay for v2:**
- Predict Your Friends
- Dinner Party Dilemmas
- Two Truths Roulette
- Bracket Battle Royale (save for v3, it's massive)
- Compliment Economy (save for v3, different vibe)

### Strategic Strengths

**Your games are BETTER aligned with Vontests than I initially thought:**

1. **Heavy emphasis on discussion** - You already have a robust comment system
2. **Deliberation over pure voting** - Aligns with "Better ↟" operator philosophy
3. **Reasoning required** - Your users already think deeply about choices
4. **Evidence-based decisions** - Could extend to games (cite sources in debates)

**This is a feature, not a bug.** Your social games can be more intellectual and discussion-heavy than typical party games.

---

## Part 9: Revised Success Metrics

### MVP Success (3 months, 4 games)

- [ ] 10+ groups created
- [ ] Average 2+ games per group per week
- [ ] 70%+ member participation per game
- [ ] At least 5 comments per game (discussion metric)
- [ ] <5% error rate
- [ ] <3 second page loads

### V2 Success (6 months, 8 games)

- [ ] 50+ active groups
- [ ] Average 4+ games per group per week
- [ ] 5+ active debates per week
- [ ] Leaderboard engagement (check weekly)
- [ ] Multi-phase completion rate >80%

---

## Conclusion

**Bottom Line:**
Your game specifications are **significantly more complex** than my original plan accounted for. The good news: they're also **more interesting, more aligned with your existing platform philosophy, and more defensible** as a unique product.

**Path Forward:**

**Option A: Full Vision (24 weeks)**
- Implement all 8 games
- All advanced features (scoring, debates, tournaments)
- Most compelling but riskiest

**Option B: Pragmatic MVP (12 weeks)**
- Launch with 4 games (Would You Rather, Hot Takes, Guess Who, Most Likely To)
- Basic scoring only
- Defer tournaments and economy games to v2
- **RECOMMENDED**

**Option C: Minimal Viable (8 weeks)**
- Launch with 2 games (Would You Rather Ranked, Hot Takes)
- Prove the intensity + debate matching concepts work
- Fastest to market

**My Recommendation:** **Option B** - Pragmatic MVP

Get 4 solid, discussion-heavy games working well, with basic scoring/leaderboards. This proves your core value proposition (social games that make you think and discuss), validates the technical architecture, and gives you real user feedback to prioritize v2 features.

**Next Steps:**
1. Review this analysis
2. Choose your preferred option (A, B, or C)
3. I'll create a revised implementation plan based on your choice
4. Start Phase 1 (Groups foundation)

---

**Questions to Consider:**

1. Which games are non-negotiable for your MVP?
2. Are you willing to launch without leaderboards initially?
3. Should we focus on debate quality over game quantity?
4. Timeline pressure - do you have a target launch date?
5. Team size - are you solo or will you have help?

Let me know your thoughts and I'll refine the plan accordingly! 🚀
