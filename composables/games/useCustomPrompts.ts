import type { VisualElement } from './useWouldYouRather';

export interface CustomPrompt {
	id: string;
	game_type: 'would_you_rather' | 'hot_takes' | 'guess_who_said_it' | 'most_likely_to';
	prompt_data: any;
	tags: string[];
	created_at: string;
	created_by_username: string;
	usage_count: number;
}

export interface CustomPromptStats {
	total: number;
	this_week: number;
	remaining_this_week: number;
	by_game_type: Record<string, number>;
}

export interface WouldYouRatherData {
	option_a: string;
	option_b: string;
	option_a_visual?: VisualElement;
	option_b_visual?: VisualElement;
}

export interface HotTakesData {
	statement: string;
	visual?: VisualElement;
}

export interface GuessWhoSaidItData {
	question: string;
	visual?: VisualElement;
}

export interface MostLikelyToData {
	scenario: string;
	visual?: VisualElement;
}

export type CustomPromptData =
	| WouldYouRatherData
	| HotTakesData
	| GuessWhoSaidItData
	| MostLikelyToData;

export const useCustomPrompts = (groupId: string) => {
	const supabase = useSupabaseClient();

	const loading = ref(false);
	const error = ref<string | null>(null);
	const prompts = ref<CustomPrompt[]>([]);
	const stats = ref<CustomPromptStats | null>(null);

	/**
	 * Create a new custom prompt
	 */
	const createPrompt = async (
		gameType: string,
		promptData: CustomPromptData,
		tags: string[] = []
	): Promise<{ success: boolean; error?: string; promptId?: string }> => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: rpcError } = await supabase.rpc('create_custom_prompt', {
				p_group_id: groupId,
				p_game_type: gameType,
				p_prompt_data: promptData as any,
				p_tags: tags,
			});

			if (rpcError) throw rpcError;

			if (data && !data.success) {
				error.value = data.error;
				return { success: false, error: data.error };
			}

			// Refresh prompts list and stats
			await Promise.all([fetchPrompts(), fetchStats()]);

			return {
				success: true,
				promptId: data?.prompt_id,
			};
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Delete a custom prompt
	 */
	const deletePrompt = async (
		promptId: string
	): Promise<{ success: boolean; error?: string }> => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: rpcError } = await supabase.rpc('delete_custom_prompt', {
				p_prompt_id: promptId,
				p_group_id: groupId,
			});

			if (rpcError) throw rpcError;

			if (data && !data.success) {
				error.value = data.error;
				return { success: false, error: data.error };
			}

			// Refresh prompts list and stats
			await Promise.all([fetchPrompts(), fetchStats()]);

			return { success: true };
		} catch (e: any) {
			error.value = e.message;
			return { success: false, error: e.message };
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Fetch all custom prompts for the group
	 */
	const fetchPrompts = async () => {
		loading.value = true;
		error.value = null;

		try {
			const { data, error: rpcError } = await supabase.rpc('get_custom_prompts', {
				p_group_id: groupId,
			});

			if (rpcError) throw rpcError;

			prompts.value = (data || []) as CustomPrompt[];
		} catch (e: any) {
			error.value = e.message;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Fetch stats about custom prompts
	 */
	const fetchStats = async () => {
		try {
			const { data, error: rpcError } = await supabase.rpc('get_custom_prompt_stats', {
				p_group_id: groupId,
			});

			if (rpcError) throw rpcError;

			stats.value = data as CustomPromptStats;
		} catch (e: any) {
			console.error('Error fetching stats:', e);
		}
	};

	/**
	 * Get display text for a prompt based on game type
	 */
	const getPromptDisplayText = (prompt: CustomPrompt): string => {
		switch (prompt.game_type) {
			case 'would_you_rather':
				return `${prompt.prompt_data.option_a} vs ${prompt.prompt_data.option_b}`;
			case 'hot_takes':
				return prompt.prompt_data.statement;
			case 'guess_who_said_it':
				return prompt.prompt_data.question;
			case 'most_likely_to':
				return prompt.prompt_data.scenario;
			default:
				return 'Unknown prompt';
		}
	};

	return {
		loading,
		error,
		prompts,
		stats,
		createPrompt,
		deletePrompt,
		fetchPrompts,
		fetchStats,
		getPromptDisplayText,
	};
};
