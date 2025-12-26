// Game type definitions and metadata
// This is the single source of truth for all game information

export type GameType =
  | 'would_you_rather'
  | 'hot_takes'
  | 'guess_who_said_it'
  | 'most_likely_to'
  | 'predict_your_friends'
  | 'dinner_party_dilemmas'
  | 'two_truths_roulette'
  | 'compliment_economy'
  | 'bracket_battle';

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
  disabled?: boolean; // If true, game is not yet implemented
  comingSoon?: boolean; // Show "Coming Soon" badge
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
  predict_your_friends: {
    id: 'predict_your_friends',
    name: 'Predict Your Friends',
    shortName: 'Predict',
    description: 'Predict what your friends will do or think. Test how well you know them!',
    detailedDescription: 'Daily prediction question about group members. Everyone predicts, then one person gives the true answer. Points for accuracy and discussion about why people predicted what they did.',
    icon: 'i-heroicons-light-bulb',
    color: 'indigo',
    minPlayers: 3,
    estimatedTime: '5-10 minutes',
    howToPlay: [
      'Daily prediction question posted',
      'Everyone makes their predictions',
      'Oracle reveals the truth',
      'Oracle selects closest predictions'
    ],
  },
  dinner_party_dilemmas: {
    id: 'dinner_party_dilemmas',
    name: 'Dinner Party Dilemmas',
    shortName: 'Dinner Party',
    description: 'Curate the most interesting dinner party guest list.',
    detailedDescription: 'Weekly challenge: invite 3 out of 8 figures to your dinner party from historical figures, fictional characters, or celebrities. Submit picks with reasoning and group votes on whose party would be most interesting.',
    icon: 'i-heroicons-user-group',
    color: 'pink',
    minPlayers: 3,
    estimatedTime: '10-15 minutes',
    howToPlay: [
      'Choose 3 guests from 8 options',
      'Explain your reasoning',
      'Group votes on best party',
      'Debate in dedicated threads'
    ],
    disabled: true,
    comingSoon: true,
  },
  two_truths_roulette: {
    id: 'two_truths_roulette',
    name: 'Two Truths Roulette',
    shortName: 'Two Truths',
    description: 'Submit two truths and a lie about your week. Can friends spot the lie?',
    detailedDescription: 'Weekly game where everyone submits two truths and one lie about their week. Group votes on which is the lie. Points for fooling friends and guessing correctly!',
    icon: 'i-heroicons-sparkles',
    color: 'cyan',
    minPlayers: 3,
    estimatedTime: '5-10 minutes',
    howToPlay: [
      'Submit two truths and one lie',
      'Friends vote on the lie',
      'Reveal correct answer',
      'Share stories in chat'
    ],
  },
  compliment_economy: {
    id: 'compliment_economy',
    name: 'The Compliment Economy',
    shortName: 'Compliments',
    description: 'Award compliment coins to friends for specific moments. Make appreciation intentional.',
    detailedDescription: 'Each week you get 5 compliment coins to award to friends for specific things. Must include explanation. Public feed of compliments with reactions. Coins expire weekly!',
    icon: 'i-heroicons-heart',
    color: 'rose',
    minPlayers: 2,
    estimatedTime: 'Ongoing',
    howToPlay: [
      'Receive 5 coins per week',
      'Award individually with reasons',
      'Read public compliment feed',
      'Submit as many as you have coins'
    ],
  },
  bracket_battle: {
    id: 'bracket_battle',
    name: 'Bracket Battle Royale',
    shortName: 'Bracket',
    description: 'Settle debates tournament-style with single-elimination brackets.',
    detailedDescription: 'Create 8 or 16-competitor tournaments for any topic. Group debates each matchup before voting. Winners advance until final champion. Perfect for settling those ongoing arguments!',
    icon: 'i-heroicons-trophy',
    color: 'orange',
    minPlayers: 3,
    estimatedTime: '7-10 days',
    howToPlay: [
      'Nominate tournament entries',
      'Seed top competitors',
      'Debate each matchup',
      'Vote to advance winners'
    ],
    disabled: true,
    comingSoon: true,
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

// Helper to get color classes for a game type (Tailwind needs static classes)
export const getGameColorClasses = (color: string) => {
  const colorMap: Record<string, { icon: string; iconLarge: string; bg: string; bgDark: string; border: string; borderDark: string }> = {
    blue: {
      icon: 'text-blue-600',
      iconLarge: 'text-blue-500',
      bg: 'bg-blue-100',
      bgDark: 'dark:bg-blue-900/20',
      border: 'border-blue-200',
      borderDark: 'dark:border-blue-800',
    },
    red: {
      icon: 'text-red-600',
      iconLarge: 'text-red-500',
      bg: 'bg-red-100',
      bgDark: 'dark:bg-red-900/20',
      border: 'border-red-200',
      borderDark: 'dark:border-red-800',
    },
    purple: {
      icon: 'text-purple-600',
      iconLarge: 'text-purple-500',
      bg: 'bg-purple-100',
      bgDark: 'dark:bg-purple-900/20',
      border: 'border-purple-200',
      borderDark: 'dark:border-purple-800',
    },
    cyan: {
      icon: 'text-cyan-600',
      iconLarge: 'text-cyan-500',
      bg: 'bg-cyan-100',
      bgDark: 'dark:bg-cyan-900/20',
      border: 'border-cyan-200',
      borderDark: 'dark:border-cyan-800',
    },
    indigo: {
      icon: 'text-indigo-600',
      iconLarge: 'text-indigo-500',
      bg: 'bg-indigo-100',
      bgDark: 'dark:bg-indigo-900/20',
      border: 'border-indigo-200',
      borderDark: 'dark:border-indigo-800',
    },
    pink: {
      icon: 'text-pink-600',
      iconLarge: 'text-pink-500',
      bg: 'bg-pink-100',
      bgDark: 'dark:bg-pink-900/20',
      border: 'border-pink-200',
      borderDark: 'dark:border-pink-800',
    },
    rose: {
      icon: 'text-rose-600',
      iconLarge: 'text-rose-500',
      bg: 'bg-rose-100',
      bgDark: 'dark:bg-rose-900/20',
      border: 'border-rose-200',
      borderDark: 'dark:border-rose-800',
    },
    orange: {
      icon: 'text-orange-600',
      iconLarge: 'text-orange-500',
      bg: 'bg-orange-100',
      bgDark: 'dark:bg-orange-900/20',
      border: 'border-orange-200',
      borderDark: 'dark:border-orange-800',
    },
  };

  return colorMap[color] || colorMap.blue; // Default to blue if color not found
};
