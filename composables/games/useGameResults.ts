import type { Database } from '~/types/supabase';
import type { GameType } from '~/types/games';

type GameInstance = Database['public']['Tables']['game_instances']['Row'];

export interface GameResult {
	gameInstanceId: string;
	gameType: GameType;
	prompt: any; // Game-specific prompt data
	results: any; // Game-specific results
	participants: Array<{
		userId: string;
		username: string;
		avatarUrl: string;
	}>;
	metadata?: any;
}

export const useGameResults = () => {
	const supabase = useSupabaseClient<Database>();

	/**
	 * Format game results into a readable HTML message for chat
	 */
	const formatGameResultMessage = (result: GameResult): string => {
		const { gameType, prompt, results } = result;

		// Base message structure
		let html = `<div class="game-result">`;
		html += `<div class="game-header" style="font-weight: bold; font-size: 1.1em; margin-bottom: 0.5em;">`;
		html += `🎮 Game Results: ${getGameName(gameType)}`;
		html += `</div>`;

		// Game-specific formatting
		switch (gameType) {
			case 'would_you_rather':
				html += formatWouldYouRatherResults(prompt, results);
				break;
			case 'hot_takes':
				html += formatHotTakesResults(prompt, results);
				break;
			case 'guess_who_said_it':
				html += formatGuessWhoResults(prompt, results);
				break;
			case 'most_likely_to':
				html += formatMostLikelyResults(prompt, results);
				break;
			default:
				html += `<div>Results for ${gameType}</div>`;
		}

		html += `</div>`;
		return html;
	};

	/**
	 * Post game results to the group chat
	 */
	const postResultsToChat = async (
		groupId: string,
		result: GameResult
	): Promise<{ success: boolean; error?: string }> => {
		try {
			// Get or create the group's chat thread
			let { data: thread, error: threadError } = await supabase
				.from('threads')
				.select('id')
				.eq('reference_id', groupId)
				.eq('type', 'game_general')
				.single();

			if (threadError && threadError.code !== 'PGRST116') {
				throw threadError;
			}

			// Create thread if it doesn't exist
			if (!thread) {
				const { data: newThread, error: createError } = await supabase
					.from('threads')
					.insert({
						reference_id: groupId,
						type: 'game_general',
					})
					.select()
					.single();

				if (createError) throw createError;
				thread = newThread;
			}

			if (!thread) {
				throw new Error('Failed to get or create chat thread');
			}

			// Format the message
			const message = formatGameResultMessage(result);

			// Post to chat using the comments table
			const { error: commentError } = await supabase
				.from('comments')
				.insert({
					thread_id: thread.id,
					user_id: (await supabase.auth.getUser()).data.user?.id,
					comment: message,
				});

			if (commentError) throw commentError;

			return { success: true };
		} catch (error: any) {
			console.error('Error posting game results to chat:', error);
			return { success: false, error: error.message };
		}
	};

	/**
	 * Post a game announcement card to chat (with gradient and clickable)
	 */
	const postGameAnnouncement = async (
		groupId: string,
		gameType: GameType,
		message: string,
		responseCount: number = 0,
		totalMembers: number = 0
	): Promise<{ success: boolean; error?: string }> => {
		try {
			// Get or create the group's chat thread
			let { data: thread, error: threadError } = await supabase
				.from('threads')
				.select('id')
				.eq('reference_id', groupId)
				.eq('type', 'game_general')
				.single();

			if (threadError && threadError.code !== 'PGRST116') {
				throw threadError;
			}

			if (!thread) {
				const { data: newThread, error: createError } = await supabase
					.from('threads')
					.insert({
						reference_id: groupId,
						type: 'game_general',
					})
					.select()
					.single();

				if (createError) throw createError;
				thread = newThread;
			}

			if (!thread) {
				throw new Error('Failed to get or create chat thread');
			}

			// Format announcement as a gradient card (matching the old style)
			const announcement = `
				<a href="/games/${groupId}?tab=games" style="
					display: block;
					text-decoration: none;
					font-style: italic;
					padding: 1.25em;
					background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
					border-radius: 0.5em;
					color: white;
					text-align: center;
					cursor: pointer;
					transition: transform 0.2s;
				" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
					<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🎮</div>
					<div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">
						${getGameName(gameType)} Started!
					</div>
					<div style="font-size: 0.9rem; margin-bottom: 0.75rem; opacity: 0.95;">
						${message}
					</div>
					<div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 0.75rem; margin-top: 0.75rem;">
						<div style="font-size: 1.75rem; font-weight: bold; margin-bottom: 0.25rem;">
							${responseCount}
						</div>
						<div style="font-size: 0.85rem; opacity: 0.9;">
							${responseCount === 1 ? 'response' : 'responses'} ${totalMembers > 0 ? `• ${totalMembers - responseCount} left to play` : ''}
						</div>
					</div>
				</a>
			`;

			// Post to chat
			const { error: commentError } = await supabase
				.from('comments')
				.insert({
					thread_id: thread.id,
					user_id: (await supabase.auth.getUser()).data.user?.id,
					comment: announcement,
				});

			if (commentError) throw commentError;

			return { success: true };
		} catch (error: any) {
			console.error('Error posting game announcement:', error);
			return { success: false, error: error.message };
		}
	};

	/**
	 * Post response count update to chat (unified with game announcement)
	 */
	const postResponseCountUpdate = async (
		groupId: string,
		gameType: GameType,
		responseCount: number,
		totalMembers: number,
		message: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			// Get the group's chat thread
			const { data: thread, error: threadError } = await supabase
				.from('threads')
				.select('id')
				.eq('reference_id', groupId)
				.eq('type', 'game_general')
				.single();

			if (threadError) throw threadError;
			if (!thread) throw new Error('Chat thread not found');

			// Use the same unified card format
			const countCard = `
				<a href="/games/${groupId}?tab=games" style="
					display: block;
					text-decoration: none;
					font-style: italic;
					padding: 1.25em;
					background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
					border-radius: 0.5em;
					color: white;
					text-align: center;
					cursor: pointer;
					transition: transform 0.2s;
				" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
					<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🎮</div>
					<div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">
						${getGameName(gameType)} is Live!
					</div>
					<div style="font-size: 0.9rem; margin-bottom: 0.75rem; opacity: 0.95;">
						${message}
					</div>
					<div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 0.75rem; margin-top: 0.75rem;">
						<div style="font-size: 1.75rem; font-weight: bold; margin-bottom: 0.25rem;">
							${responseCount}
						</div>
						<div style="font-size: 0.85rem; opacity: 0.9;">
							${responseCount === 1 ? 'response' : 'responses'} • ${totalMembers - responseCount} left to play
						</div>
					</div>
				</a>
			`;

			// Post to chat
			const { error: commentError } = await supabase
				.from('comments')
				.insert({
					thread_id: thread.id,
					user_id: (await supabase.auth.getUser()).data.user?.id,
					comment: countCard,
				});

			if (commentError) throw commentError;

			return { success: true };
		} catch (error: any) {
			console.error('Error posting response count update:', error);
			return { success: false, error: error.message };
		}
	};

	return {
		formatGameResultMessage,
		postResultsToChat,
		postGameAnnouncement,
		postResponseCountUpdate,
	};
};

// Helper functions for formatting specific game types

function getGameName(gameType: GameType): string {
	const names: Record<GameType, string> = {
		would_you_rather: 'Would You Rather',
		hot_takes: 'Hot Takes',
		guess_who_said_it: 'Guess Who Said It',
		most_likely_to: 'Most Likely To',
	};
	return names[gameType] || gameType;
}

function formatWouldYouRatherResults(prompt: any, results: any): string {
	let html = '<div style="margin: 0.5em 0;">';
	html += `<div style="font-weight: 600;">Question:</div>`;
	html += `<div style="margin: 0.25em 0;">${prompt.option_a || 'Option A'} <strong>vs</strong> ${prompt.option_b || 'Option B'}</div>`;

	if (results?.votes) {
		html += '<div style="margin-top: 0.5em;">';
		html += `<div>📊 Option A: ${results.votes.option_a || 0} votes (avg intensity: ${results.avg_intensity_a || 0})</div>`;
		html += `<div>📊 Option B: ${results.votes.option_b || 0} votes (avg intensity: ${results.avg_intensity_b || 0})</div>`;
		html += '</div>';
	}

	html += '</div>';
	return html;
}

function formatHotTakesResults(prompt: any, results: any): string {
	let html = '<div style="margin: 0.5em 0;">';
	html += `<div style="font-weight: 600;">Hot Take:</div>`;
	html += `<div style="margin: 0.25em 0; font-style: italic;">"${prompt.statement || ''}"</div>`;

	if (results?.breakdown) {
		html += '<div style="margin-top: 0.5em;">';
		html += `<div>✅ Agree: ${results.breakdown.agree || 0}</div>`;
		html += `<div>❌ Disagree: ${results.breakdown.disagree || 0}</div>`;
		html += `<div>🤷 Neutral: ${results.breakdown.neutral || 0}</div>`;
		html += '</div>';
	}

	if (results?.topDebaters && results.topDebaters.length > 0) {
		html += '<div style="margin-top: 0.5em; font-size: 0.9em;">';
		html += `<div>🔥 Most Active: ${results.topDebaters.join(', ')}</div>`;
		html += '</div>';
	}

	html += '</div>';
	return html;
}

function formatGuessWhoResults(prompt: any, results: any): string {
	let html = '<div style="margin: 0.5em 0;">';
	html += `<div style="font-weight: 600;">Question:</div>`;
	html += `<div style="margin: 0.25em 0;">${prompt.question || ''}</div>`;

	if (results?.topGuesser) {
		html += '<div style="margin-top: 0.5em;">';
		html += `<div>🏆 Best Guesser: ${results.topGuesser.username} (${results.topGuesser.correct || 0} correct)</div>`;
		html += '</div>';
	}

	if (results?.responses && results.responses.length > 0) {
		html += '<div style="margin-top: 0.5em; font-size: 0.9em;">';
		html += '<div>Responses:</div>';
		results.responses.forEach((r: any) => {
			html += `<div>• ${r.text} - ${r.author}</div>`;
		});
		html += '</div>';
	}

	html += '</div>';
	return html;
}

function formatMostLikelyResults(prompt: any, results: any): string {
	let html = '<div style="margin: 0.5em 0;">';
	html += `<div style="font-weight: 600;">Most Likely To:</div>`;
	html += `<div style="margin: 0.25em 0;">${prompt.scenario || ''}</div>`;

	if (results?.winner) {
		html += '<div style="margin-top: 0.5em;">';
		html += `<div>🏆 Winner: ${results.winner.username} (${results.winner.votes || 0} votes)</div>`;
		html += '</div>';
	}

	if (results?.topThree && results.topThree.length > 0) {
		html += '<div style="margin-top: 0.5em; font-size: 0.9em;">';
		html += '<div>Top 3:</div>';
		results.topThree.forEach((person: any, index: number) => {
			const medal = ['🥇', '🥈', '🥉'][index] || '•';
			html += `<div>${medal} ${person.username} - ${person.votes} votes</div>`;
		});
		html += '</div>';
	}

	html += '</div>';
	return html;
}
