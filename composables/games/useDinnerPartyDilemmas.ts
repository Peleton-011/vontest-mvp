import type { Database } from '~/types/supabase';

// Type definitions
export interface DinnerPartyDilemmasPrompt {
	theme?: string; // e.g., "Historical Figures", "Fictional Characters"
	options: Array<{
		id: string;
		name: string;
		description?: string;
		imageUrl?: string;
	}>;
	visual?: {
		type: 'emoji' | 'image';
		value: string;
	};
}

export interface DinnerPartySubmission {
	selectedGuestIds: string[]; // 3 guest IDs
	reasoning: string;
}

export interface DinnerPartyResults {
	submissions: Array<{
		userId: string;
		username: string;
		avatarUrl: string;
		selectedGuests: Array<{
			id: string;
			name: string;
			description?: string;
		}>;
		reasoning: string;
		voteCount: number;
		voters: string[];
	}>;
	winner: {
		userId: string;
		username: string;
		voteCount: number;
	} | null;
	responses: any[];
}

type GameInstance = Database['public']['Tables']['game_instances']['Row'];
type GameResponse = Database['public']['Tables']['game_responses']['Row'];

export const useDinnerPartyDilemmas = (groupId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();
	const { postResultsToChat } = useGameResults();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const currentGame = ref<GameInstance | null>(null);
	const userResponse = ref<GameResponse | null>(null);

	// Create a new Dinner Party Dilemmas game
	const createGame = async (
		prompt: DinnerPartyDilemmasPrompt,
		expiresInHours: number = 24
	): Promise<{ success: boolean; gameId?: string; error?: string }> => {
		if (!user.value) {
			return { success: false, error: 'User not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Generate default guest options if not provided
			let guestOptions = prompt.options;
			if (!guestOptions || guestOptions.length === 0) {
				const theme = prompt.theme || 'Famous People';
				guestOptions = [
					{ id: '1', name: `Guest from ${theme} #1` },
					{ id: '2', name: `Guest from ${theme} #2` },
					{ id: '3', name: `Guest from ${theme} #3` },
					{ id: '4', name: `Guest from ${theme} #4` },
					{ id: '5', name: `Guest from ${theme} #5` },
					{ id: '6', name: `Guest from ${theme} #6` },
					{ id: '7', name: `Guest from ${theme} #7` },
					{ id: '8', name: `Guest from ${theme} #8` },
				];
			}

			const expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + expiresInHours);

			const fullPrompt: DinnerPartyDilemmasPrompt = {
				...prompt,
				options: guestOptions,
			};

			const { data: game, error: createError } = await supabase
				.from('game_instances')
				.insert({
					group_id: groupId,
					game_type: 'dinner_party_dilemmas',
					prompt: fullPrompt,
					expires_at: expiresAt.toISOString(),
					status: 'active',
					current_phase: 'submission',
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

	// Get active game for this group
	const getActiveGame = async () => {
		try {
			const { data, error: fetchError } = await supabase
				.from('game_instances')
				.select('*')
				.eq('group_id', groupId)
				.eq('game_type', 'dinner_party_dilemmas')
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

	// Submit party lineup (Phase 1)
	const submitPartyLineup = async (gameId: string, submission: DinnerPartySubmission) => {
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
						selectedGuestIds: submission.selectedGuestIds,
						reasoning: submission.reasoning,
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

	// Submit vote (Phase 2)
	const submitVote = async (gameId: string, votedUserId: string) => {
		if (!user.value) {
			return { success: false, error: 'Not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Update existing response with vote
			const { data, error: updateError } = await supabase
				.from('game_responses')
				.update({
					response_data: {
						...(userResponse.value?.response_data as any),
						votedUserId,
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

	// Start voting phase (admin only)
	const startVotingPhase = async (gameId: string) => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: updateError } = await supabase
				.from('game_instances')
				.update({ current_phase: 'voting' })
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
	const getResults = async (gameId: string): Promise<DinnerPartyResults | null> => {
		try {
			// Get game to extract guest options
			const { data: game, error: gameError } = await supabase
				.from('game_instances')
				.select('*')
				.eq('id', gameId)
				.single();

			if (gameError) throw gameError;

			const prompt = game.prompt as DinnerPartyDilemmasPrompt;

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
					winner: null,
					responses: [],
				};
			}

			// Build submissions with vote counts
			const voteCounts = new Map<string, { voters: string[]; count: number }>();
			responses.forEach((r: any) => {
				const votedUserId = r.response_data?.votedUserId;
				if (votedUserId) {
					if (!voteCounts.has(votedUserId)) {
						voteCounts.set(votedUserId, { voters: [], count: 0 });
					}
					const voteData = voteCounts.get(votedUserId)!;
					voteData.voters.push(r.user_id);
					voteData.count++;
				}
			});

			const submissions = responses.map((response: any) => {
				const selectedGuestIds = response.response_data?.selectedGuestIds || [];
				const selectedGuests = selectedGuestIds.map((id: string) => {
					const guest = prompt.options.find(o => o.id === id);
					return {
						id,
						name: guest?.name || 'Unknown',
						description: guest?.description,
					};
				});

				const voteData = voteCounts.get(response.user_id) || { voters: [], count: 0 };

				return {
					userId: response.user_id,
					username: response.profiles?.username || 'Unknown',
					avatarUrl: response.profiles?.avatar_url || '',
					selectedGuests,
					reasoning: response.response_data?.reasoning || '',
					voteCount: voteData.count,
					voters: voteData.voters,
				};
			});

			// Find winner (most votes)
			const winner = submissions.reduce((max, curr) =>
				curr.voteCount > (max?.voteCount || 0) ? curr : max
			, submissions[0] || null);

			return {
				submissions,
				winner: winner ? {
					userId: winner.userId,
					username: winner.username,
					voteCount: winner.voteCount,
				} : null,
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
		createGame,
		getActiveGame,
		getUserResponse,
		submitPartyLineup,
		submitVote,
		startVotingPhase,
		completeGame,
		getResults,
	};
};
