import type { Database } from '~/types/supabase';

// Type definitions
export interface PredictYourFriendsPrompt {
	question: string; // The prediction question
	oracleUserId: string; // The person whose answer is the truth
	options?: string[]; // Optional: predefined options (multiple choice)
	visual?: {
		type: 'emoji' | 'image';
		value: string;
	};
}

export interface PredictYourFriendsPrediction {
	prediction: string; // What the user predicts
}

export interface PredictYourFriendsOracleAnswer {
	answer: string; // The oracle's true answer
}

export interface PredictYourFriendsResults {
	question: string;
	oracleUserId: string;
	oracleUsername: string;
	oracleAvatarUrl: string;
	correctAnswer: string;
	predictions: Array<{
		userId: string;
		username: string;
		avatarUrl: string;
		prediction: string;
		isCorrect: boolean;
		points: number;
	}>;
	correctPredictors: Array<{
		userId: string;
		username: string;
		points: number;
	}>;
	responses: any[];
}

type GameInstance = Database['public']['Tables']['game_instances']['Row'];
type GameResponse = Database['public']['Tables']['game_responses']['Row'];

export const usePredictYourFriends = (groupId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();
	const { postResultsToChat } = useGameResults();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const currentGame = ref<GameInstance | null>(null);
	const userResponse = ref<GameResponse | null>(null);

	// Create a new Predict Your Friends game
	const createGame = async (
		prompt: Omit<PredictYourFriendsPrompt, 'oracleUserId'>,
		expiresInHours: number = 24
	): Promise<{ success: boolean; gameId?: string; error?: string }> => {
		if (!user.value) {
			return { success: false, error: 'User not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Get all group members to select a random oracle
			const { data: members } = await supabase
				.from('group_members')
				.select('user_id')
				.eq('group_id', groupId);

			if (!members || members.length === 0) {
				throw new Error('No members found in group');
			}

			// Select random oracle
			const randomIndex = Math.floor(Math.random() * members.length);
			const oracleUserId = members[randomIndex].user_id;

			const expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + expiresInHours);

			const fullPrompt: PredictYourFriendsPrompt = {
				...prompt,
				oracleUserId,
			};

			const { data: game, error: createError } = await supabase
				.from('game_instances')
				.insert({
					group_id: groupId,
					game_type: 'predict_your_friends',
					prompt: fullPrompt,
					expires_at: expiresAt.toISOString(),
					status: 'active',
					current_phase: 'prediction',
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
				.eq('game_type', 'predict_your_friends')
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
				.eq('game_instance_id', gameId)
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

	// Check if user is the oracle
	const isOracle = computed(() => {
		if (!currentGame.value || !user.value) return false;
		const prompt = currentGame.value.prompt as PredictYourFriendsPrompt;
		return prompt.oracleUserId === user.value.id;
	});

	// Submit prediction (for non-oracle players)
	const submitPrediction = async (gameId: string, prediction: string) => {
		if (!user.value) {
			return { success: false, error: 'Not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			const { data, error: submitError } = await supabase
				.from('game_responses')
				.insert({
					game_instance_id: gameId,
					user_id: user.value.id,
					response_data: {
						prediction,
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

	// Submit oracle answer (for oracle only)
	const submitOracleAnswer = async (gameId: string, answer: string) => {
		if (!user.value) {
			return { success: false, error: 'Not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			const { data, error: submitError } = await supabase
				.from('game_responses')
				.insert({
					game_instance_id: gameId,
					user_id: user.value.id,
					response_data: {
						oracleAnswer: answer,
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

	// Submit oracle selections (Phase 2: Oracle chooses which predictions are correct)
	const submitOracleSelections = async (gameId: string, selectedUserIds: string[]) => {
		if (!user.value) {
			return { success: false, error: 'Not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Update the oracle's response to include their selections
			const { data, error: updateError } = await supabase
				.from('game_responses')
				.update({
					response_data: {
						...(userResponse.value?.response_data as any),
						selectedUserIds,
					},
				})
				.eq('game_instance_id', gameId)
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

	// Start oracle selection phase (admin only)
	const startOracleSelectionPhase = async (gameId: string) => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: updateError } = await supabase
				.from('game_instances')
				.update({ current_phase: 'oracle_selection' })
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
	const getResults = async (gameId: string): Promise<PredictYourFriendsResults | null> => {
		try {
			// Get game to extract oracle info
			const { data: game, error: gameError } = await supabase
				.from('game_instances')
				.select('*')
				.eq('id', gameId)
				.single();

			if (gameError) throw gameError;

			const prompt = game.prompt as PredictYourFriendsPrompt;

			// Fetch all responses with user profiles
			const { data: responses, error: responsesError } = await supabase
				.from('game_responses')
				.select(`
					*,
					profiles:user_id (username, avatar_url)
				`)
				.eq('game_instance_id', gameId);

			if (responsesError) throw responsesError;
			if (!responses || responses.length === 0) {
				return {
					question: prompt.question,
					oracleUserId: prompt.oracleUserId,
					oracleUsername: '',
					oracleAvatarUrl: '',
					correctAnswer: '',
					predictions: [],
					correctPredictors: [],
					responses: [],
				};
			}

			// Find the oracle's answer and selections
			const oracleResponse = responses.find((r: any) => r.user_id === prompt.oracleUserId);
			const correctAnswer = oracleResponse?.response_data?.oracleAnswer || '';
			const selectedUserIds = oracleResponse?.response_data?.selectedUserIds || [];

			// Build predictions array
			const predictions = responses
				.filter((r: any) => r.user_id !== prompt.oracleUserId) // Exclude oracle
				.map((response: any) => {
					const prediction = response.response_data?.prediction || '';
					// Use oracle's selections to determine correctness
					const isCorrect = selectedUserIds.includes(response.user_id);
					const points = isCorrect ? 10 : 0;

					return {
						userId: response.user_id,
						username: response.profiles?.username || 'Unknown',
						avatarUrl: response.profiles?.avatar_url || '',
						prediction,
						isCorrect,
						points,
					};
				});

			// Get correct predictors
			const correctPredictors = predictions
				.filter(p => p.isCorrect)
				.map(p => ({
					userId: p.userId,
					username: p.username,
					points: p.points,
				}));

			return {
				question: prompt.question,
				oracleUserId: prompt.oracleUserId,
				oracleUsername: oracleResponse?.profiles?.username || 'Unknown',
				oracleAvatarUrl: oracleResponse?.profiles?.avatar_url || '',
				correctAnswer,
				predictions,
				correctPredictors,
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
		isOracle,
		createGame,
		getActiveGame,
		getUserResponse,
		submitPrediction,
		submitOracleAnswer,
		submitOracleSelections,
		startOracleSelectionPhase,
		completeGame,
		getResults,
	};
};
