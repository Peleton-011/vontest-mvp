import type { Database } from '~/types/supabase';

export const useGameScheduler = () => {
	const supabase = useSupabaseClient<Database>();

	const loading = ref(false);
	const error = ref<string | null>(null);

	/**
	 * Manually trigger game creation for a specific group
	 * Useful for testing and manual game creation
	 */
	const createGameForGroup = async (
		groupId: string
	): Promise<{ success: boolean; data?: any; error?: string }> => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: rpcError } = await supabase.rpc('create_scheduled_game', {
				p_group_id: groupId,
			});

			if (rpcError) throw rpcError;

			const result = data as any;

			if (!result.success) {
				error.value = result.error || 'Failed to create game';
				return { success: false, error: error.value };
			}

			return {
				success: true,
				data: {
					gameId: result.game_id,
					gameType: result.game_type,
					expiresAt: result.expires_at,
				},
			};
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Create games for all groups
	 * Typically called by a scheduled job
	 */
	const createDailyGames = async (): Promise<{
		success: boolean;
		created?: number;
		errors?: number;
		details?: any[];
		error?: string;
	}> => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: rpcError } = await supabase.rpc('create_daily_games');

			if (rpcError) throw rpcError;

			const result = data as any;

			return {
				success: true,
				created: result.created_games,
				errors: result.errors,
				details: result.details,
			};
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Check if a group should have a new game created
	 * Based on timezone and notification time
	 */
	const shouldCreateGame = async (groupId: string): Promise<boolean> => {
		try {
			const { data, error: rpcError } = await supabase.rpc(
				'should_create_game_for_group',
				{
					p_group_id: groupId,
				}
			);

			if (rpcError) throw rpcError;

			return data as boolean;
		} catch (e: any) {
			error.value = e.message;
			return false;
		}
	};

	/**
	 * Get all game prompts for a specific game type
	 */
	const getPrompts = async (
		gameType: string
	): Promise<{ success: boolean; prompts?: any[]; error?: string }> => {
		try {
			const { data: prompts, error: fetchError } = await supabase
				.from('game_prompts')
				.select('*')
				.eq('game_type', gameType)
				.eq('is_active', true)
				.order('usage_count', { ascending: true });

			if (fetchError) throw fetchError;

			return { success: true, prompts: prompts || [] };
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		}
	};

	/**
	 * Add a new game prompt
	 */
	const addPrompt = async (
		gameType: string,
		promptData: any,
		tags: string[] = []
	): Promise<{ success: boolean; promptId?: string; error?: string }> => {
		try {
			const { data, error: insertError } = await supabase
				.from('game_prompts')
				.insert({
					game_type: gameType,
					prompt_data: promptData,
					tags,
				})
				.select()
				.single();

			if (insertError) throw insertError;

			return { success: true, promptId: data.id };
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		}
	};

	/**
	 * Deactivate a prompt (soft delete)
	 */
	const deactivatePrompt = async (
		promptId: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			const { error: updateError } = await supabase
				.from('game_prompts')
				.update({ is_active: false })
				.eq('id', promptId);

			if (updateError) throw updateError;

			return { success: true };
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		}
	};

	return {
		loading,
		error,
		createGameForGroup,
		createDailyGames,
		shouldCreateGame,
		getPrompts,
		addPrompt,
		deactivatePrompt,
	};
};
