import type { Database } from '~/types/supabase';

// Type definitions
export interface ComplimentEconomyPrompt {
	coinsPerPlayer: number; // Usually 5
	theme?: string;
	visual?: {
		type: 'emoji' | 'image';
		value: string;
	};
}

export interface ComplimentSubmission {
	compliments: Array<{
		recipientUserId: string;
		coins: number; // 1-5
		reason: string;
	}>;
}

export interface ComplimentEconomyResults {
	compliments: Array<{
		giverUserId: string;
		giverUsername: string;
		giverAvatarUrl: string;
		recipientUserId: string;
		recipientUsername: string;
		recipientAvatarUrl: string;
		coins: number;
		reason: string;
	}>;
	topRecipients: Array<{
		userId: string;
		username: string;
		avatarUrl: string;
		totalCoins: number;
		complimentCount: number;
	}>;
	topGivers: Array<{
		userId: string;
		username: string;
		coinsGiven: number;
	}>;
	responses: any[];
}

type GameInstance = Database['public']['Tables']['game_instances']['Row'];
type GameResponse = Database['public']['Tables']['game_responses']['Row'];

export const useComplimentEconomy = (groupId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();
	const { postResultsToChat } = useGameResults();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const currentGame = ref<GameInstance | null>(null);
	const userResponse = ref<GameResponse | null>(null);

	// Create a new Compliment Economy game
	const createGame = async (
		prompt: ComplimentEconomyPrompt,
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
					game_type: 'compliment_economy',
					prompt: prompt,
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
				.eq('game_type', 'compliment_economy')
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

	// Submit compliments
	const submitCompliments = async (gameId: string, submission: ComplimentSubmission) => {
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
						compliments: submission.compliments,
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

	// Complete game (admin only)
	const completeGame = async (gameId: string) => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: updateError } = await supabase
				.from('game_instances')
				.update({
					status: 'completed',
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
	const getResults = async (gameId: string): Promise<ComplimentEconomyResults | null> => {
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
					compliments: [],
					topRecipients: [],
					topGivers: [],
					responses: [],
				};
			}

			// Also fetch profiles for all users to get recipient info
			const { data: allProfiles, error: profilesError } = await supabase
				.from('profiles')
				.select('user_id, username, avatar_url')
				.in('user_id', responses.flatMap((r: any) =>
					(r.response_data?.compliments || []).map((c: any) => c.recipientUserId)
				));

			if (profilesError) throw profilesError;

			const profileMap = new Map(
				(allProfiles || []).map(p => [p.user_id, p])
			);

			// Build compliments list
			const compliments: any[] = [];
			responses.forEach((response: any) => {
				const giverProfile = response.profiles;
				const responseCompliments = response.response_data?.compliments || [];

				responseCompliments.forEach((comp: any) => {
					const recipientProfile = profileMap.get(comp.recipientUserId);
					compliments.push({
						giverUserId: response.user_id,
						giverUsername: giverProfile?.username || 'Unknown',
						giverAvatarUrl: giverProfile?.avatar_url || '',
						recipientUserId: comp.recipientUserId,
						recipientUsername: recipientProfile?.username || 'Unknown',
						recipientAvatarUrl: recipientProfile?.avatar_url || '',
						coins: comp.coins,
						reason: comp.reason,
					});
				});
			});

			// Calculate top recipients (most coins received)
			const recipientTotals = new Map<string, { username: string; avatarUrl: string; totalCoins: number; count: number }>();
			compliments.forEach(comp => {
				if (!recipientTotals.has(comp.recipientUserId)) {
					recipientTotals.set(comp.recipientUserId, {
						username: comp.recipientUsername,
						avatarUrl: comp.recipientAvatarUrl,
						totalCoins: 0,
						count: 0,
					});
				}
				const data = recipientTotals.get(comp.recipientUserId)!;
				data.totalCoins += comp.coins;
				data.count++;
			});

			const topRecipients = Array.from(recipientTotals.entries())
				.map(([userId, data]) => ({
					userId,
					username: data.username,
					avatarUrl: data.avatarUrl,
					totalCoins: data.totalCoins,
					complimentCount: data.count,
				}))
				.sort((a, b) => b.totalCoins - a.totalCoins)
				.slice(0, 3);

			// Calculate top givers (most coins given)
			const giverTotals = new Map<string, number>();
			compliments.forEach(comp => {
				giverTotals.set(
					comp.giverUserId,
					(giverTotals.get(comp.giverUserId) || 0) + comp.coins
				);
			});

			const topGivers = Array.from(giverTotals.entries())
				.map(([userId, coins]) => {
					const comp = compliments.find(c => c.giverUserId === userId);
					return {
						userId,
						username: comp?.giverUsername || 'Unknown',
						coinsGiven: coins,
					};
				})
				.sort((a, b) => b.coinsGiven - a.coinsGiven)
				.slice(0, 3);

			return {
				compliments,
				topRecipients,
				topGivers,
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
		submitCompliments,
		completeGame,
		getResults,
	};
};
