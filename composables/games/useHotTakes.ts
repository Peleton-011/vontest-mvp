import type { Database } from '~/types/supabase';
import type { VisualElement } from './useWouldYouRather';

type GameInstance = Database['public']['Tables']['game_instances']['Row'];
type GameResponse = Database['public']['Tables']['game_responses']['Row'];

export interface HotTakesPrompt {
	statement: string;
	visual?: VisualElement;
}

export interface HotTakesResponse {
	stance: 'agree' | 'disagree' | 'neutral';
	reasoning?: string; // Optional explanation
}

export interface HotTakesResults {
	breakdown: {
		agree: number;
		disagree: number;
		neutral: number;
	};
	responses: Array<{
		userId: string;
		username: string;
		stance: 'agree' | 'disagree' | 'neutral';
		reasoning?: string;
	}>;
	topDebaters: string[]; // Users with longest reasoning
}

export const useHotTakes = (groupId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();
	const { postResultsToChat } = useGameResults();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const currentGame = ref<GameInstance | null>(null);
	const userResponse = ref<HotTakesResponse | null>(null);

	/**
	 * Create a new Hot Takes game
	 */
	const createGame = async (
		prompt: HotTakesPrompt,
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
					game_type: 'hot_takes',
					prompt: prompt,
					expires_at: expiresAt.toISOString(),
					status: 'active',
					current_phase: 'voting',
					metadata: {
						agree: 0,
						disagree: 0,
						neutral: 0,
					},
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
	 * Submit a response to a Hot Takes game
	 */
	const submitResponse = async (
		gameId: string,
		response: HotTakesResponse
	): Promise<{ success: boolean; error?: string }> => {
		if (!user.value) {
			return { success: false, error: 'User not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Check if user already responded
			const { data: existing } = await supabase
				.from('game_responses')
				.select('id')
				.eq('game_instance_id', gameId)
				.eq('user_id', user.value.id)
				.single();

			if (existing) {
				return { success: false, error: 'You have already responded to this game' };
			}

			// Submit response
			const { error: responseError } = await supabase
				.from('game_responses')
				.insert({
					game_instance_id: gameId,
					user_id: user.value.id,
					response_data: response,
				});

			if (responseError) throw responseError;

			// Update game metadata with vote counts
			const { data: game } = await supabase
				.from('game_instances')
				.select('metadata')
				.eq('id', gameId)
				.single();

			const metadata = game?.metadata as any || { agree: 0, disagree: 0, neutral: 0 };
			metadata[response.stance] = (metadata[response.stance] || 0) + 1;

			await supabase
				.from('game_instances')
				.update({ metadata })
				.eq('id', gameId);

			userResponse.value = response;

			return { success: true };
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		} finally {
			loading.value = false;
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
				.eq('game_type', 'hot_takes')
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
	 * Get user's response to a game
	 */
	const getUserResponse = async (gameId: string): Promise<HotTakesResponse | null> => {
		if (!user.value) return null;

		try {
			const { data: response, error: fetchError } = await supabase
				.from('game_responses')
				.select('response_data')
				.eq('game_instance_id', gameId)
				.eq('user_id', user.value.id)
				.single();

			if (fetchError && fetchError.code !== 'PGRST116') {
				throw fetchError;
			}

			if (response) {
				userResponse.value = response.response_data as HotTakesResponse;
				return userResponse.value;
			}

			return null;
		} catch (e: any) {
			error.value = e.message;
			return null;
		}
	};

	/**
	 * Calculate and get game results
	 */
	const getResults = async (gameId: string): Promise<HotTakesResults | null> => {
		try {
			// Get all responses with user info
			const { data: responses, error: responsesError } = await supabase
				.from('game_responses')
				.select(`
					user_id,
					response_data,
					profiles:user_id (username)
				`)
				.eq('game_instance_id', gameId);

			if (responsesError) throw responsesError;

			// Calculate results
			let agree = 0, disagree = 0, neutral = 0;
			const formattedResponses: HotTakesResults['responses'] = [];
			const debaters: Array<{ username: string; reasoningLength: number }> = [];

			responses?.forEach((r: any) => {
				const data = r.response_data as HotTakesResponse;

				if (data.stance === 'agree') agree++;
				else if (data.stance === 'disagree') disagree++;
				else neutral++;

				formattedResponses.push({
					userId: r.user_id,
					username: r.profiles?.username || 'Unknown',
					stance: data.stance,
					reasoning: data.reasoning,
				});

				// Track debaters (those with reasoning)
				if (data.reasoning && data.reasoning.length > 0) {
					debaters.push({
						username: r.profiles?.username || 'Unknown',
						reasoningLength: data.reasoning.length,
					});
				}
			});

			// Get top 3 debaters by reasoning length
			const topDebaters = debaters
				.sort((a, b) => b.reasoningLength - a.reasoningLength)
				.slice(0, 3)
				.map(d => d.username);

			return {
				breakdown: { agree, disagree, neutral },
				responses: formattedResponses,
				topDebaters,
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
				gameType: 'hot_takes',
				prompt: game.prompt,
				results,
				participants: results.responses.map(r => ({
					userId: r.userId,
					username: r.username,
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
		submitResponse,
		getActiveGame,
		getUserResponse,
		getResults,
		completeGame,
	};
};
