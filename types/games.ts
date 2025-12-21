// Game type definitions and metadata

export type GameType =
  | 'would_you_rather'
  | 'hot_takes'
  | 'guess_who_said_it'
  | 'most_likely_to';

export interface GameTypeMetadata {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  color: string;
  minPlayers: number;
}

export const GAME_TYPES: Record<GameType, GameTypeMetadata> = {
  would_you_rather: {
    id: 'would_you_rather',
    name: 'Would You Rather',
    description: 'Vote on two options with intensity (1-10). See how your group compares!',
    icon: 'i-heroicons-scale',
    color: 'blue',
    minPlayers: 2,
  },
  hot_takes: {
    id: 'hot_takes',
    name: 'Hot Takes',
    description: 'Share controversial opinions and debate with those who disagree.',
    icon: 'i-heroicons-fire',
    color: 'red',
    minPlayers: 3,
  },
  guess_who_said_it: {
    id: 'guess_who_said_it',
    name: 'Guess Who Said It',
    description: 'Submit anonymous responses, then guess who said what!',
    icon: 'i-heroicons-question-mark-circle',
    color: 'purple',
    minPlayers: 3,
  },
  most_likely_to: {
    id: 'most_likely_to',
    name: 'Most Likely To',
    description: 'Vote on who in your group is most likely to do something.',
    icon: 'i-heroicons-trophy',
    color: 'yellow',
    minPlayers: 3,
  },
};

// Helper to get all game types as array
export const getAllGameTypes = (): GameTypeMetadata[] => {
  return Object.values(GAME_TYPES);
};

// Helper to validate game type
export const isValidGameType = (type: string): type is GameType => {
  return type in GAME_TYPES;
};
