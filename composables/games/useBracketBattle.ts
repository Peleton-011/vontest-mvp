import type { Database } from '~/types/supabase';

// Type definitions
export interface BracketBattlePrompt {
	topic: string; // e.g., "Best Pizza Toppings", "Greatest Movie Villains"
	bracketSize: 8 | 16;
	visual?: {
		type: 'emoji' | 'image';
		value: string;
	};
}

export interface BracketEntry {
	id: string;
	name: string;
	description?: string;
	nominatedBy: string;
}

export interface Matchup {
	id: string;
	round: number; // 1 = first round, 2 = semifinals, 3 = finals
	entry1Id: string;
	entry2Id: string;
	winnerId?: string;
	votes?: Record<string, string>; // userId -> entryId they voted for
}

export interface BracketBattleResults {
	champion: {
		id: string;
		name: string;
		description?: string;
	} | null;
	bracket: Matchup[];
	allEntries: BracketEntry[];
	responses: any[];
}

type GameInstance = Database['public']['Tables']['game_instances']['Row'];
type GameResponse = Database['public']['Tables']['game_responses']['Row'];

export const useBracketBattle = (groupId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();
	const { postResultsToChat } = useGameResults();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const currentGame = ref<GameInstance | null>(null);
	const userResponse = ref<GameResponse | null>(null);

	// Create a new Bracket Battle game
	const createGame = async (
		prompt: BracketBattlePrompt,
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
					game_type: 'bracket_battle',
					prompt: prompt,
					expires_at: expiresAt.toISOString(),
					status: 'active',
					current_phase: 'nomination',
					metadata: {
						bracketSize: prompt.bracketSize,
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

	// Get active game for this group
	const getActiveGame = async () => {
		try {
			const { data, error: fetchError } = await supabase
				.from('game_instances')
				.select('*')
				.eq('group_id', groupId)
				.eq('game_type', 'bracket_battle')
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

	// Submit tournament entry (Phase 1)
	const submitEntry = async (gameId: string, entryName: string, entryDescription?: string) => {
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
						entry: {
							name: entryName,
							description: entryDescription,
						},
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

	// Submit vote for current round
	const submitVote = async (gameId: string, matchupId: string, votedEntryId: string) => {
		if (!user.value) {
			return { success: false, error: 'Not authenticated' };
		}

		loading.value = true;
		error.value = null;

		try {
			// Get or create response for voting
			let response = userResponse.value;

			if (!response) {
				// Create initial response
				const { data: newResponse, error: createError } = await supabase
					.from('game_responses')
					.insert({
						game_instance_id: gameId,
						user_id: user.value.id,
						response_data: {
							votes: { [matchupId]: votedEntryId },
						},
					})
					.select()
					.single();

				if (createError) throw createError;
				response = newResponse;
			} else {
				// Update existing response
				const existingVotes = response.response_data?.votes || {};
				const { data: updatedResponse, error: updateError } = await supabase
					.from('game_responses')
					.update({
						response_data: {
							...response.response_data,
							votes: {
								...existingVotes,
								[matchupId]: votedEntryId,
							},
						},
					})
					.eq('game_instance_id', gameId)
					.eq('user_id', user.value.id)
					.select()
					.single();

				if (updateError) throw updateError;
				response = updatedResponse;
			}

			userResponse.value = response;
			return { success: true, data: response };
		} catch (err: any) {
			error.value = err.message;
			return { success: false, error: err.message };
		} finally {
			loading.value = false;
		}
	};

	// Helper: Generate bracket matchups from entries
	const generateBracket = (entries: BracketEntry[], bracketSize: number): Matchup[] => {
		// Shuffle entries for random seeding
		const shuffled = [...entries].sort(() => Math.random() - 0.5);

		// Pad with byes if needed
		while (shuffled.length < bracketSize) {
			shuffled.push({
				id: `bye-${shuffled.length}`,
				name: '(BYE)',
				nominatedBy: 'System',
			});
		}

		// Create round 1 matchups
		const matchups: Matchup[] = [];
		const numFirstRoundMatchups = bracketSize / 2;

		for (let i = 0; i < numFirstRoundMatchups; i++) {
			matchups.push({
				id: `round1-matchup${i}`,
				round: 1,
				entry1Id: shuffled[i * 2].id,
				entry2Id: shuffled[i * 2 + 1].id,
				votes: {},
			});
		}

		return matchups;
	};

	// Start voting rounds (admin - initializes bracket)
	const startVotingPhase = async (gameId: string) => {
		loading.value = true;
		error.value = null;

		try {
			// Get all entries
			const { data: responses, error: responsesError } = await supabase
				.from('game_responses')
				.select(`
					*,
					profiles:user_id (username, avatar_url)
				`)
				.eq('game_instance_id', gameId);

			if (responsesError) throw responsesError;

			// Build entries list
			const allEntries: BracketEntry[] = responses
				.filter((r: any) => r.response_data?.entry)
				.map((r: any, index: number) => ({
					id: `entry-${index}`,
					name: r.response_data.entry.name,
					description: r.response_data.entry.description,
					nominatedBy: r.profiles?.username || 'Unknown',
				}));

			// Get bracket size from prompt
			const game = currentGame.value;
			if (!game) throw new Error('No active game');

			const prompt = game.prompt as BracketBattlePrompt;
			const bracketSize = prompt.bracketSize || 8;

			// Generate initial bracket
			const bracket = generateBracket(allEntries, bracketSize);

			// Store bracket in metadata and start voting
			const { data, error: updateError } = await supabase
				.from('game_instances')
				.update({
					current_phase: 'voting_round_1',
					metadata: {
						...game.metadata,
						bracket,
						allEntries,
						currentRound: 1,
					},
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

	// Advance to next round (admin - tallies votes and creates next round matchups)
	const advanceToNextRound = async (gameId: string) => {
		loading.value = true;
		error.value = null;

		try {
			const game = currentGame.value;
			if (!game) throw new Error('No active game');

			const metadata = game.metadata as any;
			const currentRound = metadata.currentRound || 1;
			const bracket: Matchup[] = metadata.bracket || [];
			const allEntries: BracketEntry[] = metadata.allEntries || [];

			// Get all voting responses
			const { data: responses } = await supabase
				.from('game_responses')
				.select('*')
				.eq('game_instance_id', gameId);

			// Tally votes for current round matchups
			const currentRoundMatchups = bracket.filter((m: Matchup) => m.round === currentRound);

			currentRoundMatchups.forEach((matchup: Matchup) => {
				const votes: Record<string, number> = {};

				responses?.forEach((r: any) => {
					const userVote = r.response_data?.votes?.[matchup.id];
					if (userVote) {
						votes[userVote] = (votes[userVote] || 0) + 1;
					}
				});

				// Determine winner (most votes, or entry1 if tie)
				const entry1Votes = votes[matchup.entry1Id] || 0;
				const entry2Votes = votes[matchup.entry2Id] || 0;
				matchup.winnerId = entry1Votes >= entry2Votes ? matchup.entry1Id : matchup.entry2Id;
			});

			// Create next round matchups
			const winners = currentRoundMatchups.map((m: Matchup) => m.winnerId!);
			const nextRound = currentRound + 1;
			const nextRoundMatchups: Matchup[] = [];

			for (let i = 0; i < winners.length / 2; i++) {
				nextRoundMatchups.push({
					id: `round${nextRound}-matchup${i}`,
					round: nextRound,
					entry1Id: winners[i * 2],
					entry2Id: winners[i * 2 + 1],
					votes: {},
				});
			}

			// Add new matchups to bracket
			const updatedBracket = [...bracket, ...nextRoundMatchups];

			// Determine next phase
			let nextPhase = `voting_round_${nextRound}`;
			if (nextRoundMatchups.length === 1) {
				nextPhase = 'voting_finals';
			}

			// Update game
			const { data, error: updateError } = await supabase
				.from('game_instances')
				.update({
					current_phase: nextPhase,
					metadata: {
						...metadata,
						bracket: updatedBracket,
						currentRound: nextRound,
					},
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
	const getResults = async (gameId: string): Promise<BracketBattleResults | null> => {
		try {
			const game = currentGame.value;
			if (!game) {
				await getActiveGame();
			}

			const metadata = game?.metadata as any;
			const bracket: Matchup[] = metadata?.bracket || [];
			const allEntries: BracketEntry[] = metadata?.allEntries || [];

			// Fetch all responses
			const { data: responses, error: responsesError } = await supabase
				.from('game_responses')
				.select(`
					*,
					profiles:user_id (username, avatar_url)
				`)
				.eq('game_instance_id', gameId);

			if (responsesError) throw responsesError;

			// If no bracket yet, build simple entries list from responses
			if (bracket.length === 0 && responses && responses.length > 0) {
				const simpleEntries: BracketEntry[] = responses
					.filter((r: any) => r.response_data?.entry)
					.map((r: any, index: number) => ({
						id: `entry-${index}`,
						name: r.response_data.entry.name,
						description: r.response_data.entry.description,
						nominatedBy: r.profiles?.username || 'Unknown',
					}));

				return {
					champion: null,
					bracket: [],
					allEntries: simpleEntries,
					responses: responses || [],
				};
			}

			// Find champion (winner of final matchup)
			const finalMatchup = bracket.find((m: Matchup) => {
				const matchupsInRound = bracket.filter((bm: Matchup) => bm.round === m.round);
				return matchupsInRound.length === 1;
			});

			let champion: BracketEntry | null = null;
			if (finalMatchup?.winnerId) {
				champion = allEntries.find((e: BracketEntry) => e.id === finalMatchup.winnerId) || null;
			}

			return {
				champion,
				bracket,
				allEntries,
				responses: responses || [],
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
		submitEntry,
		submitVote,
		startVotingPhase,
		advanceToNextRound,
		completeGame,
		getResults,
	};
};
