<script setup lang="ts">
import OptionsDropdown from "~/components/ui/OptionsDropdown.vue";
import { useProposals } from "~/composables/useProposals";
import { useComments } from "~/composables/useComments";
import type { Database } from "~/types/supabase";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"] & {
	users: { username: string; avatar_url: string | null };
};

const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();

const proposalId = route.params.id as string;
const vontestId = route.params.vontestId as string;

const { fetchProposal } = useProposals(vontestId);
const proposal = ref<Proposal | null>(
	(await fetchProposal(route.params.id as string)) || null
);

// comments state
const { fetchComments, addComment } = useComments();
const comments = ref<CommentRow[]>([]);
const newCommentText = ref("");

// load comments on mount
onMounted(async () => {
	try {
		comments.value = await fetchComments(proposalId);
	} catch (e) {
		console.error("Error loading comments:", e);
	}
});

// handler to post a new top-level comment
const postComment = async () => {
	if (!newCommentText.value.trim()) return;
	try {
		await addComment(proposalId, newCommentText.value);
		// simple: re-fetch the whole list
		comments.value = await fetchComments(proposalId);
		newCommentText.value = "";
	} catch (e: any) {
		console.error("Failed to post comment:", e.message);
	}
};

// navigation helper
const navigateTo = (path: string) => router.push(path);
</script>

<template>
	<section class="max-w-4xl mx-auto px-4 py-8 text-white space-y-6">
		<!-- Proposal card as before -->
		<UCard v-if="proposal">
			<!-- ... existing header, body, footer ... -->
		</UCard>

		<!-- Comments section -->
		<div>
			<h3 class="text-xl font-semibold mb-2">Discussion</h3>

			<!-- New comment box -->
			<div class="mb-4">
				<textarea
					v-model="newCommentText"
					class="w-full p-2 rounded bg-gray-800"
					rows="3"
					placeholder="Write your reply..."
				/>
				<div class="text-right mt-2">
					<UButton
						label="Post Comment"
						:disabled="!newCommentText.trim()"
						@click="postComment"
					/>
				</div>
			</div>

			<!-- Comments list -->
			<div class="space-y-4">
				<div
					v-for="c in comments"
					:key="c.comment_id"
					class="p-4 bg-gray-900 rounded"
				>
					<div class="flex items-center mb-1">
						<img
							v-if="c.users.avatar_url"
							:src="c.users.avatar_url"
							class="w-6 h-6 rounded-full mr-2"
						/>
						<span class="font-medium">{{ c.users.username }}</span>
						<small class="text-gray-500 ml-2">
							• {{ new Date(c.created_at!).toLocaleString() }}
						</small>
					</div>
					<p class="text-gray-300">{{ c.comment }}</p>
				</div>
			</div>
		</div>
	</section>
</template>
