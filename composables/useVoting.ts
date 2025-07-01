import type { Database } from "~/types/supabase";

type Ballot = Database["public"]["Tables"]["ballots"]["Row"];
type BallotInsert = Database["public"]["Tables"]["ballots"]["Insert"];
type Vote = Database["public"]["Tables"]["votes"]["Row"];
type VoteInsert = Database["public"]["Tables"]["votes"]["Insert"];

export const useVoting = () => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	// Form state for creating a ballot with votes
	const form = reactive({
		vontestId: "" as string,
		votes: [] as { proposalId: string; value: number }[],
	});

	// Reset form
	const resetForm = () => {
		form.vontestId = "";
		form.votes = [];
	};

	// Fetch ballots for a vontest
	const fetchBallots = async (vontestId: string) => {
		const { data, error } = await supabase
			.from("ballots")
			.select("*")
			.eq("vontest_id", vontestId);

		if (error) {
			alert(error.message);
			return [];
		}

		return data as Ballot[];
	};

	// Fetch votes for a ballot
	const fetchVotes = async (ballotId: string) => {
		const { data, error } = await supabase
			.from("votes")
			.select("*")
			.eq("ballot_id", ballotId);

		if (error) {
			alert(error.message);
			return [];
		}

		return data as Vote[];
	};

	// Create ballot + votes atomically
	const submitBallot = async () => {
		if (!form.vontestId || form.votes.length === 0) {
			alert(
				"Please select proposals and assign values before submitting."
			);
			return;
		}

		if (!user.value) {
			alert("You must be logged in to submit votes.");
			return;
		}

		// Check if ballot exists
		const { data: existingBallot, error: ballotFetchError } = await supabase
			.from("ballots")
			.select("*")
			.eq("user_id", user.value.id)
			.eq("vontest_id", form.vontestId)
			.single();

		let ballotId = existingBallot?.id;

		// If no existing ballot, create one
		if (!ballotId) {
			const { data: newBallot, error: ballotInsertError } = await supabase
				.from("ballots")
				.insert({
					user_id: user.value.id,
					vontest_id: form.vontestId,
				})
				.select()
				.single();

			if (ballotInsertError) {
				alert(ballotInsertError.message);
				return;
			}
			ballotId = newBallot.id;
		}

		// Prepare votes insert payload
		const votesToInsert = form.votes.map((v) => ({
			ballot_id: ballotId,
			proposal_id: v.proposalId,
			value: v.value,
		}));

		// Upsert votes (insert or update existing)
		const { error: votesError } = await supabase
			.from("votes")
			.upsert(votesToInsert, {
				onConflict: "ballot_id,proposal_id",
			});

		if (votesError) {
			alert(votesError.message);
			return;
		}

		resetForm();
		alert("Votes submitted!");
		return ballotId;
	};

	return {
		form: { ...toRefs(form) },
		resetForm,
		fetchBallots,
		fetchVotes,
		submitBallot,
	};
};
