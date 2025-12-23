import type { Database } from '~/types/supabase';

type GameInstance = Database['public']['Tables']['game_instances']['Row'];
type GameResponse = Database['public']['Tables']['game_responses']['Row'];

export interface MostLikelyToPrompt {
	scenario: string;
}

export interface MostLikelyToResponse {
	votedUserId: string; // Who they're voting for
}

export interface MostLikelyToResults {
	votes: Record<string, number>; // userId -> vote count
	winner: {
		userId: string;
		username: string;
		votes: number;
	} | null;
	topThree: Array<{
		userId: string;
		username: string;
		votes: number;
	}>;
	responses: Array<{
		voterUserId: string;
		voterUsername: string;
		votedUserId: string;
		votedUsername: string;
	}>;
}

export const useMostLikelyTo = (groupId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();
	const { postResultsToChat } = useGameResults();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const currentGame = ref<GameInstance | null>(null);
	const userResponse = ref<MostLikelyToResponse | null>(null);

	/**
	 * Create a new Most Likely To game
	 */
	const createGame = async (
		prompt: MostLikelyToPrompt,
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
					game_type: 'most_likely_to',
					prompt: prompt,
					expires_at: expiresAt.toISOString(),
					status: 'active',
					current_phase: 'voting',
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
	 * Submit a vote for a group member
	 */
	const submitVote = async (
		gameId: string,
		votedUserId: string
	): Promise<{ success: boolean; error?: string }> => {
		if (!user.value) {
			return { success: false, error: 'User not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Check if user already voted
			const { data: existing } = await supabase
				.from('game_responses')
				.select('id')
				.eq('game_instance_id', gameId)
				.eq('user_id', user.value.id)
				.single();

			if (existing) {
				return { success: false, error: 'You have already voted' };
			}

			// Submit vote
			const { error: responseError } = await supabase
				.from('game_responses')
				.insert({
					game_instance_id: gameId,
					user_id: user.value.id,
					response_data: { votedUserId },
				});

			if (responseError) throw responseError;

			userResponse.value = { votedUserId };

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
				.eq('game_type', 'most_likely_to')
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
	 * Get user's vote
	 */
	const getUserResponse = async (gameId: string): Promise<MostLikelyToResponse | null> => {
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
				userResponse.value = response.response_data as MostLikelyToResponse;
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
	const getResults = async (gameId: string): Promise<MostLikelyToResults | null> => {
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

			// Get group members for username lookup
			const { data: members } = await supabase
				.from('group_members')
				.select('user_id, profiles:user_id (username)')
				.eq('group_id', groupId);

			// Build username lookup
			const usernameMap = new Map<string, string>();
			members?.forEach((m: any) => {
				usernameMap.set(m.user_id, m.profiles?.username || 'Unknown');
			});

			// Count votes
			const voteCount: Record<string, number> = {};
			const formattedResponses: MostLikelyToResults['responses'] = [];

			responses?.forEach((r: any) => {
				const data = r.response_data as MostLikelyToResponse;
				const votedUserId = data.votedUserId;

				// Increment vote count
				voteCount[votedUserId] = (voteCount[votedUserId] || 0) + 1;

				// Add to formatted responses
				formattedResponses.push({
					voterUserId: r.user_id,
					voterUsername: r.profiles?.username || 'Unknown',
					votedUserId,
					votedUsername: usernameMap.get(votedUserId) || 'Unknown',
				});
			});

			// Find winner and top 3
			const sortedVotes = Object.entries(voteCount)
				.map(([userId, votes]) => ({
					userId,
					username: usernameMap.get(userId) || 'Unknown',
					votes,
				}))
				.sort((a, b) => b.votes - a.votes);

			const winner = sortedVotes.length > 0 ? sortedVotes[0] : null;
			const topThree = sortedVotes.slice(0, 3);

			return {
				votes: voteCount,
				winner,
				topThree,
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
				gameType: 'most_likely_to',
				prompt: game.prompt,
				results,
				participants: results.responses.map(r => ({
					userId: r.voterUserId,
					username: r.voterUsername,
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
		submitVote,
		getActiveGame,
		getUserResponse,
		getResults,
		completeGame,
	};
};
