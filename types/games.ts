// Game type definitions and metadata
// This is the single source of truth for all game information

export type GameType =
  | 'would_you_rather'
  | 'hot_takes'
  | 'guess_who_said_it'
  | 'most_likely_to';

export interface GameTypeMetadata {
  id: GameType;
  name: string;
  shortName: string; // For compact displays
  description: string;
  detailedDescription: string; // Longer explanation for game creation form
  icon: string;
  color: string;
  minPlayers: number;
  estimatedTime: string; // e.g., "2-5 minutes"
  howToPlay: string[]; // Step-by-step instructions
}

export const GAME_TYPES: Record<GameType, GameTypeMetadata> = {
  would_you_rather: {
    id: 'would_you_rather',
    name: 'Would You Rather',
    shortName: 'WYR',
    description: 'Vote on two options with intensity (1-10). See how your group compares!',
    detailedDescription: 'Present two challenging choices and have everyone vote on their preference. Players also rate how strongly they feel (1-10 intensity). Perfect for sparking conversations and discovering surprising preferences!',
    icon: 'i-heroicons-scale',
    color: 'blue',
    minPlayers: 2,
    estimatedTime: '2-5 minutes',
    howToPlay: [
      'Admin creates a question with two options',
      'Everyone votes for their preferred option',
      'Rate your choice intensity from 1-10',
      'See results and compare with your group'
    ],
  },
  hot_takes: {
    id: 'hot_takes',
    name: 'Hot Takes',
    shortName: 'Hot Takes',
    description: 'Share controversial opinions and debate with those who disagree.',
    detailedDescription: 'Present a controversial statement and have everyone agree, disagree, or stay neutral. Those who disagree can explain why, leading to fun debates!',
    icon: 'i-heroicons-fire',
    color: 'red',
    minPlayers: 3,
    estimatedTime: '5-10 minutes',
    howToPlay: [
      'Admin posts a controversial statement',
      'Everyone votes: Agree, Disagree, or Neutral',
      'Share your reasoning (optional)',
      'See who agrees and who doesn\'t'
    ],
  },
  guess_who_said_it: {
    id: 'guess_who_said_it',
    name: 'Guess Who Said It',
    shortName: 'Guess Who',
    description: 'Submit anonymous responses, then guess who said what!',
    detailedDescription: 'Everyone anonymously answers a question, then you try to match answers to people. Great for learning surprising things about your friends!',
    icon: 'i-heroicons-question-mark-circle',
    color: 'purple',
    minPlayers: 3,
    estimatedTime: '5-10 minutes',
    howToPlay: [
      'Admin posts a question',
      'Everyone submits anonymous answers',
      'Try to guess who said what',
      'See how well you know your friends'
    ],
  },
  most_likely_to: {
    id: 'most_likely_to',
    name: 'Most Likely To',
    shortName: 'Most Likely',
    description: 'Vote on who in your group is most likely to do something.',
    detailedDescription: 'Present a scenario and have everyone vote on which group member would most likely do it. Fun way to discover how your friends see you!',
    icon: 'i-heroicons-trophy',
    color: 'yellow',
    minPlayers: 3,
    estimatedTime: '2-5 minutes',
    howToPlay: [
      'Admin posts a scenario',
      'Everyone votes for a group member',
      'You can vote for yourself!',
      'See who "wins" each scenario'
    ],
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

// Helper to get game metadata
export const getGameMetadata = (type: GameType): GameTypeMetadata => {
  return GAME_TYPES[type];
};
