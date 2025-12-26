import type { Database } from '~/types/supabase';

// Type definitions
export interface TwoTruthsRoulettePrompt {
	category?: string;
	timeframe?: string; // e.g., "this week", "this month", "ever"
	visual?: {
		type: 'emoji' | 'image';
		value: string;
	};
}

export interface TwoTruthsRouletteSubmission {
	statement1: string;
	statement2: string;
	statement3: string;
	lieIndex: 1 | 2 | 3; // Which statement is the lie
}

export interface TwoTruthsRouletteVote {
	targetUserId: string; // The user whose statements they're voting on
	guessedLieIndex: 1 | 2 | 3;
}

export interface TwoTruthsRouletteResults {
	submissions: Array<{
		userId: string;
		username: string;
		avatarUrl: string;
		statements: [string, string, string];
		lieIndex: number;
		fooledCount: number; // How many people they fooled
		votes: Array<{
			voterId: string;
			voterUsername: string;
			guessedLieIndex: number;
			wasCorrect: boolean;
		}>;
	}>;
	topFoolers: Array<{ userId: string; username: string; fooledCount: number }>;
	topDetectives: Array<{ userId: string; username: string; correctGuesses: number }>;
	responses: any[];
}

type GameInstance = Database['public']['Tables']['game_instances']['Row'];
type GameResponse = Database['public']['Tables']['game_responses']['Row'];

export const useTwoTruthsRoulette = (groupId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const currentGame = ref<GameInstance | null>(null);
	const userResponse = ref<GameResponse | null>(null);

	// Get active game for this group
	const getActiveGame = async () => {
		try {
			const { data, error: fetchError } = await supabase
				.from('game_instances')
				.select('*')
				.eq('group_id', groupId)
				.eq('game_type', 'two_truths_roulette')
				.eq('status', 'active')
				.order('created_at', { ascending: false })
				.limit(1)
				.single();

			if (fetchError && fetchError.code !== 'PGRST116') {
				throw fetchError;
			}

			currentGame.value = data;
			return data;
		} catch (err: any) {
			error.value = err.message;
			return null;
		}
	};

	// Get user's response for a game
	const getUserResponse = async (gameId: string) => {
		if (!user.value) return null;

		try {
			const { data, error: fetchError } = await supabase
				.from('game_responses')
				.select('*')
				.eq('game_id', gameId)
				.eq('user_id', user.value.id)
				.single();

			if (fetchError && fetchError.code !== 'PGRST116') {
				throw fetchError;
			}

			userResponse.value = data;
			return data;
		} catch (err: any) {
			error.value = err.message;
			return null;
		}
	};

	// Submit truth statements (Phase 1: Submission)
	const submitStatements = async (gameId: string, submission: TwoTruthsRouletteSubmission) => {
		if (!user.value) {
			return { success: false, error: 'Not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			const { data, error: submitError } = await supabase
				.from('game_responses')
				.insert({
					game_id: gameId,
					user_id: user.value.id,
					response_data: {
						statements: [submission.statement1, submission.statement2, submission.statement3],
						lieIndex: submission.lieIndex,
					},
				})
				.select()
				.single();

			if (submitError) throw submitError;

			userResponse.value = data;
			return { success: true, data };
		} catch (err: any) {
			error.value = err.message;
			return { success: false, error: err.message };
		} finally {
			loading.value = false;
		}
	};

	// Submit votes (Phase 2: Guessing)
	const submitVotes = async (gameId: string, votes: Record<string, number>) => {
		if (!user.value) {
			return { success: false, error: 'Not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Update existing response with votes
			const { data, error: updateError } = await supabase
				.from('game_responses')
				.update({
					response_data: {
						...(userResponse.value?.response_data as any),
						votes,
					},
				})
				.eq('game_id', gameId)
				.eq('user_id', user.value.id)
				.select()
				.single();

			if (updateError) throw updateError;

			userResponse.value = data;
			return { success: true, data };
		} catch (err: any) {
			error.value = err.message;
			return { success: false, error: err.message };
		} finally {
			loading.value = false;
		}
	};

	// Start guessing phase (admin only)
	const startGuessingPhase = async (gameId: string) => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: updateError } = await supabase
				.from('game_instances')
				.update({ current_phase: 'guessing' })
				.eq('id', gameId)
				.select()
				.single();

			if (updateError) throw updateError;

			currentGame.value = data;
			return { success: true, data };
		} catch (err: any) {
			error.value = err.message;
			return { success: false, error: err.message };
		} finally {
			loading.value = false;
		}
	};

	// Complete game (admin only)
	const completeGame = async (gameId: string) => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: updateError } = await supabase
				.from('game_instances')
				.update({
					status: 'completed',
					current_phase: 'results',
				})
				.eq('id', gameId)
				.select()
				.single();

			if (updateError) throw updateError;

			currentGame.value = data;
			return { success: true, data };
		} catch (err: any) {
			error.value = err.message;
			return { success: false, error: err.message };
		} finally {
			loading.value = false;
		}
	};

	// Get results
	const getResults = async (gameId: string): Promise<TwoTruthsRouletteResults | null> => {
		try {
			// Fetch all responses with user profiles
			const { data: responses, error: responsesError } = await supabase
				.from('game_responses')
				.select(`
					*,
					profiles:user_id (username, avatar_url)
				`)
				.eq('game_id', gameId);

			if (responsesError) throw responsesError;
			if (!responses || responses.length === 0) {
				return {
					submissions: [],
					topFoolers: [],
					topDetectives: [],
					responses: [],
				};
			}

			// Build submissions array with vote analysis
			const submissions = responses.map((response: any) => {
				const statements = response.response_data.statements || [];
				const lieIndex = response.response_data.lieIndex || 1;

				// Collect all votes for this user's statements
				const votes = responses
					.filter((r: any) => r.response_data.votes?.[response.user_id])
					.map((r: any) => {
						const guessedLieIndex = r.response_data.votes[response.user_id];
						return {
							voterId: r.user_id,
							voterUsername: r.profiles?.username || 'Unknown',
							guessedLieIndex,
							wasCorrect: guessedLieIndex === lieIndex,
						};
					});

				const fooledCount = votes.filter(v => !v.wasCorrect).length;

				return {
					userId: response.user_id,
					username: response.profiles?.username || 'Unknown',
					avatarUrl: response.profiles?.avatar_url || '',
					statements: statements as [string, string, string],
					lieIndex,
					fooledCount,
					votes,
				};
			});

			// Calculate top foolers (most people fooled)
			const topFoolers = submissions
				.filter(s => s.votes.length > 0)
				.sort((a, b) => b.fooledCount - a.fooledCount)
				.slice(0, 3)
				.map(s => ({
					userId: s.userId,
					username: s.username,
					fooledCount: s.fooledCount,
				}));

			// Calculate top detectives (most correct guesses)
			const detectiveScores = new Map<string, { username: string; correctGuesses: number }>();
			responses.forEach((response: any) => {
				const votes = response.response_data.votes || {};
				let correctGuesses = 0;

				Object.entries(votes).forEach(([targetUserId, guessedLie]) => {
					const targetSubmission = submissions.find(s => s.userId === targetUserId);
					if (targetSubmission && targetSubmission.lieIndex === guessedLie) {
						correctGuesses++;
					}
				});

				if (correctGuesses > 0) {
					detectiveScores.set(response.user_id, {
						username: response.profiles?.username || 'Unknown',
						correctGuesses,
					});
				}
			});

			const topDetectives = Array.from(detectiveScores.entries())
				.sort((a, b) => b[1].correctGuesses - a[1].correctGuesses)
				.slice(0, 3)
				.map(([userId, data]) => ({
					userId,
					username: data.username,
					correctGuesses: data.correctGuesses,
				}));

			return {
				submissions,
				topFoolers,
				topDetectives,
				responses,
			};
		} catch (err: any) {
			error.value = err.message;
			return null;
		}
	};

	return {
		loading,
		error,
		currentGame,
		userResponse,
		getActiveGame,
		getUserResponse,
		submitStatements,
		submitVotes,
		startGuessingPhase,
		completeGame,
		getResults,
	};
};
