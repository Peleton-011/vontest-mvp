import type { Database } from '~/types/supabase';

type GameInstance = Database['public']['Tables']['game_instances']['Row'];
type GameResponse = Database['public']['Tables']['game_responses']['Row'];

export interface GuessWhoSaidItPrompt {
	question: string;
}

export interface GuessWhoSaidItResponse {
	answer: string; // Anonymous answer to the question
	guesses?: Record<string, string>; // Map of response_id to guessed_user_id
}

export interface GuessWhoSaidItResults {
	responses: Array<{
		responseId: string;
		answer: string;
		actualUserId: string;
		actualUsername: string;
	}>;
	guesses: Array<{
		guesserUserId: string;
		guesserUsername: string;
		correctGuesses: number;
		totalGuesses: number;
		accuracy: number;
	}>;
	topGuesser: {
		username: string;
		correct: number;
	} | null;
}

export const useGuessWhoSaidIt = (groupId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();
	const { postResultsToChat } = useGameResults();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const currentGame = ref<GameInstance | null>(null);
	const userResponse = ref<GuessWhoSaidItResponse | null>(null);

	/**
	 * Create a new Guess Who Said It game
	 */
	const createGame = async (
		prompt: GuessWhoSaidItPrompt,
		expiresInHours: number = 24
	): Promise<{ success: boolean; gameId?: string; error?: string }> => {
		if (!user.value) {
			return { success: false, error: 'User not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			const expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + expiresInHours);

			const { data: game, error: createError } = await supabase
				.from('game_instances')
				.insert({
					group_id: groupId,
					game_type: 'guess_who_said_it',
					prompt: prompt,
					expires_at: expiresAt.toISOString(),
					status: 'active',
					current_phase: 'submission', // First phase: submit answers
					metadata: {},
				})
				.select()
				.single();

			if (createError) throw createError;

			return { success: true, gameId: game.id };
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Submit an answer (submission phase)
	 */
	const submitAnswer = async (
		gameId: string,
		answer: string
	): Promise<{ success: boolean; error?: string }> => {
		if (!user.value) {
			return { success: false, error: 'User not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Check if user already submitted
			const { data: existing } = await supabase
				.from('game_responses')
				.select('id')
				.eq('game_instance_id', gameId)
				.eq('user_id', user.value.id)
				.single();

			if (existing) {
				return { success: false, error: 'You have already submitted an answer' };
			}

			// Submit answer
			const { error: responseError } = await supabase
				.from('game_responses')
				.insert({
					game_instance_id: gameId,
					user_id: user.value.id,
					response_data: { answer },
				});

			if (responseError) throw responseError;

			userResponse.value = { answer };

			return { success: true };
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Submit guesses (guessing phase)
	 */
	const submitGuesses = async (
		gameId: string,
		guesses: Record<string, string> // responseId -> guessedUserId
	): Promise<{ success: boolean; error?: string }> => {
		if (!user.value) {
			return { success: false, error: 'User not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Get user's response to update it with guesses
			const { data: response } = await supabase
				.from('game_responses')
				.select('*')
				.eq('game_instance_id', gameId)
				.eq('user_id', user.value.id)
				.single();

			if (!response) {
				return { success: false, error: 'Must submit answer first' };
			}

			// Update response with guesses
			const updatedData = {
				...(response.response_data as any),
				guesses,
			};

			const { error: updateError } = await supabase
				.from('game_responses')
				.update({ response_data: updatedData })
				.eq('id', response.id);

			if (updateError) throw updateError;

			userResponse.value = updatedData as GuessWhoSaidItResponse;

			return { success: true };
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Move game to guessing phase
	 */
	const startGuessingPhase = async (gameId: string): Promise<{ success: boolean; error?: string }> => {
		try {
			const { error: updateError } = await supabase
				.from('game_instances')
				.update({ current_phase: 'guessing' })
				.eq('id', gameId);

			if (updateError) throw updateError;

			return { success: true };
		} catch (e: any) {
			return { success: false, error: e.message };
		}
	};

	/**
	 * Get current active game for the group
	 */
	const getActiveGame = async (): Promise<GameInstance | null> => {
		try {
			const { data: game, error: fetchError } = await supabase
				.from('game_instances')
				.select('*')
				.eq('group_id', groupId)
				.eq('game_type', 'guess_who_said_it')
				.eq('status', 'active')
				.order('created_at', { ascending: false })
				.limit(1)
				.single();

			if (fetchError && fetchError.code !== 'PGRST116') {
				throw fetchError;
			}

			currentGame.value = game;
			return game;
		} catch (e: any) {
			error.value = e.message;
			return null;
		}
	};

	/**
	 * Calculate and get game results
	 */
	const getResults = async (gameId: string): Promise<GuessWhoSaidItResults | null> => {
		try {
			// Get all responses with user info
			const { data: responses, error: responsesError } = await supabase
				.from('game_responses')
				.select(`
					id,
					user_id,
					response_data,
					profiles:user_id (username)
				`)
				.eq('game_instance_id', gameId);

			if (responsesError) throw responsesError;

			// Format responses
			const formattedResponses = responses?.map((r: any) => ({
				responseId: r.id,
				answer: r.response_data.answer,
				actualUserId: r.user_id,
				actualUsername: r.profiles?.username || 'Unknown',
			})) || [];

			// Calculate guess accuracy
			const guessStats: Map<string, { correct: number; total: number; username: string }> = new Map();

			responses?.forEach((r: any) => {
				const guesses = r.response_data.guesses;
				if (!guesses) return;

				const username = r.profiles?.username || 'Unknown';
				if (!guessStats.has(r.user_id)) {
					guessStats.set(r.user_id, { correct: 0, total: 0, username });
				}

				// Check each guess
				Object.entries(guesses).forEach(([responseId, guessedUserId]) => {
					const actualResponse = responses.find((resp: any) => resp.id === responseId);
					if (actualResponse) {
						guessStats.get(r.user_id)!.total++;
						if (actualResponse.user_id === guessedUserId) {
							guessStats.get(r.user_id)!.correct++;
						}
					}
				});
			});

			// Convert to array
			const guessArray = Array.from(guessStats.entries()).map(([userId, stats]) => ({
				guesserUserId: userId,
				guesserUsername: stats.username,
				correctGuesses: stats.correct,
				totalGuesses: stats.total,
				accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
			}));

			// Find top guesser
			const topGuesser = guessArray.reduce((best, current) => {
				if (!best || current.correctGuesses > best.correctGuesses) {
					return { username: current.guesserUsername, correct: current.correctGuesses };
				}
				return best;
			}, null as { username: string; correct: number } | null);

			return {
				responses: formattedResponses,
				guesses: guessArray,
				topGuesser,
			};
		} catch (e: any) {
			error.value = e.message;
			return null;
		}
	};

	/**
	 * Complete the game and post results to chat
	 */
	const completeGame = async (gameId: string): Promise<{ success: boolean; error?: string }> => {
		try {
			const { data: game } = await supabase
				.from('game_instances')
				.select('*')
				.eq('id', gameId)
				.single();

			if (!game) {
				return { success: false, error: 'Game not found' };
			}

			const results = await getResults(gameId);
			if (!results) {
				return { success: false, error: 'Failed to calculate results' };
			}

			// Mark game as completed
			await supabase
				.from('game_instances')
				.update({ status: 'completed' })
				.eq('id', gameId);

			// Post results to chat
			await postResultsToChat(groupId, {
				gameInstanceId: gameId,
				gameType: 'guess_who_said_it',
				prompt: game.prompt,
				results,
				participants: results.responses.map(r => ({
					userId: r.actualUserId,
					username: r.actualUsername,
					avatarUrl: '',
				})),
			});

			return { success: true };
		} catch (e: any) {
			return { success: false, error: e.message };
		}
	};

	return {
		loading,
		error,
		currentGame,
		userResponse,
		createGame,
		submitAnswer,
		submitGuesses,
		startGuessingPhase,
		getActiveGame,
		getResults,
		completeGame,
	};
};
