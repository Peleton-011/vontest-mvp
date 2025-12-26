import type { Database } from '~/types/supabase';

type GameInstance = Database['public']['Tables']['game_instances']['Row'];
type GameResponse = Database['public']['Tables']['game_responses']['Row'];

export interface VisualElement {
	type: 'emoji' | 'image';
	value: string; // emoji character or image URL
}

export interface WouldYouRatherPrompt {
	option_a: string;
	option_b: string;
	option_a_visual?: VisualElement;
	option_b_visual?: VisualElement;
}

export interface WouldYouRatherResponse {
	choice: 'a' | 'b';
	intensity: number; // 1-10 scale
}

export interface WouldYouRatherResults {
	votes: {
		option_a: number;
		option_b: number;
	};
	avg_intensity_a: number;
	avg_intensity_b: number;
	responses: Array<{
		userId: string;
		username: string;
		choice: 'a' | 'b';
		intensity: number;
	}>;
}

export const useWouldYouRather = (groupId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();
	const { postResultsToChat } = useGameResults();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const currentGame = ref<GameInstance | null>(null);
	const userResponse = ref<WouldYouRatherResponse | null>(null);

	/**
	 * Create a new Would You Rather game
	 */
	const createGame = async (
		prompt: WouldYouRatherPrompt,
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
					game_type: 'would_you_rather',
					prompt: prompt,
					expires_at: expiresAt.toISOString(),
					status: 'active',
					current_phase: 'voting',
					metadata: {
						votes_a: 0,
						votes_b: 0,
					},
				})
				.select()
				.single();

			if (createError) throw createError;

			// Get total group member count for the announcement
			const { data: members } = await supabase
				.from('group_members')
				.select('id')
				.eq('group_id', groupId);

			return { success: true, gameId: game.id };
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Submit a response to a Would You Rather game
	 */
	const submitResponse = async (
		gameId: string,
		response: WouldYouRatherResponse
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
				.select('metadata, game_type, prompt')
				.eq('id', gameId)
				.single();

			const metadata = game?.metadata as any || { votes_a: 0, votes_b: 0 };
			if (response.choice === 'a') {
				metadata.votes_a = (metadata.votes_a || 0) + 1;
			} else {
				metadata.votes_b = (metadata.votes_b || 0) + 1;
			}

			await supabase
				.from('game_instances')
				.update({ metadata })
				.eq('id', gameId);

			userResponse.value = response;

			// Get current response count
			const { data: responses } = await supabase
				.from('game_responses')
				.select('id')
				.eq('game_instance_id', gameId);

			const responseCount = responses?.length || 0;

			// Get total group member count
			const { data: members } = await supabase
				.from('group_members')
				.select('id')
				.eq('group_id', groupId);

			const totalMembers = members?.length || 0;

			// Get game prompt for the message
			const prompt = game?.prompt as WouldYouRatherPrompt;
			const message = prompt ? `Choose: ${prompt.option_a} OR ${prompt.option_b}` : 'Vote now!';


			// Check if all members have responded
			if (responseCount >= totalMembers && totalMembers > 0) {
				// Auto-complete the game
				await completeGame(gameId);
			}

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
				.eq('game_type', 'would_you_rather')
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
	const getUserResponse = async (gameId: string): Promise<WouldYouRatherResponse | null> => {
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
				userResponse.value = response.response_data as WouldYouRatherResponse;
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
	const getResults = async (gameId: string): Promise<WouldYouRatherResults | null> => {
		try {
			// Get game instance
			const { data: game, error: gameError } = await supabase
				.from('game_instances')
				.select('*')
				.eq('id', gameId)
				.single();

			if (gameError) throw gameError;

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
			let votesA = 0, votesB = 0;
			let totalIntensityA = 0, totalIntensityB = 0;
			const formattedResponses: WouldYouRatherResults['responses'] = [];

			responses?.forEach((r: any) => {
				const data = r.response_data as WouldYouRatherResponse;
				if (data.choice === 'a') {
					votesA++;
					totalIntensityA += data.intensity;
				} else {
					votesB++;
					totalIntensityB += data.intensity;
				}

				formattedResponses.push({
					userId: r.user_id,
					username: r.profiles?.username || 'Unknown',
					choice: data.choice,
					intensity: data.intensity,
				});
			});

			return {
				votes: {
					option_a: votesA,
					option_b: votesB,
				},
				avg_intensity_a: votesA > 0 ? totalIntensityA / votesA : 0,
				avg_intensity_b: votesB > 0 ? totalIntensityB / votesB : 0,
				responses: formattedResponses,
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
			// Get game and results
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
				gameType: 'would_you_rather',
				prompt: game.prompt,
				results,
				participants: results.responses.map(r => ({
					userId: r.userId,
					username: r.username,
					avatarUrl: '', // Could fetch this if needed
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
