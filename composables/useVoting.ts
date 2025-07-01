import type { Database } from "~/types/supabase";

type Ballot = Database["public"]["Tables"]["ballots"]["Row"];
type BallotInsert = Database["public"]["Tables"]["ballots"]["Insert"];
type Vote = Database["public"]["Tables"]["votes"]["Row"];
type VoteInsert = Database["public"]["Tables"]["votes"]["Insert"];

export const useVoting = (vontestId: string) => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	// Form state for creating a ballot with votes
	const form = reactive({
		votes: [] as { proposalId: string; value: number }[],
	});

	// Reset form
	const resetForm = () => {
		form.votes = [];
	};

	// Fetch ballots for a vontest
	const fetchBallots = async () => {
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

	const fetchBallot = async (ballotId: string) => {
		const { data, error } = await supabase
			.from("ballots")
			.select("*")
			.eq("id", ballotId)
			.single();

		if (error) {
			alert(error.message);
			return null;
		}

		return data as Ballot;
	};

	const fetchUserBallot = async () => {
		if (!user.value) return null;

		const { data, error } = await supabase
			.from("ballots")
			.select("*")
			.eq("user_id", user.value.id)
			.eq("vontest_id", vontestId)
			.single();

		if (error) {
			console.error(error);
			return null;
		}

		return data as Ballot;
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

	const getBallotId = async () => {
		if (!user.value) {
			alert("You must be logged in to submit votes.");
			return;
		}

		// Check if ballot exists
		const { data: existingBallot, error: ballotFetchError } = await supabase
			.from("ballots")
			.select("*")
			.eq("user_id", user.value.id)
			.eq("vontest_id", vontestId)
			.single();

		let ballotId = existingBallot?.id;

		// If no existing ballot, create one
		if (!ballotId) {
			const { data: newBallot, error: ballotInsertError } = await supabase
				.from("ballots")
				.insert({
					user_id: user.value.id,
					vontest_id: vontestId,
				})
				.select()
				.single();

			if (ballotInsertError) {
				alert(ballotInsertError.message);
				return;
			}
			ballotId = newBallot.id;
		}

		return ballotId;
	};

	// Create ballot + votes atomically
	const submitBallot = async () => {
		if (!vontestId || form.votes.length === 0) {
			alert(
				"Please select proposals and assign values before submitting."
			);
			return;
		}

		if (!user.value) {
			alert("You must be logged in to submit votes.");
			return;
		}

		const ballotId = await getBallotId();

		if (!ballotId) {
			alert("Error creating or fetching ballot.");
			return;
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

	const updateVotes = async (
		ballotId: string,
		votes: { proposalId: string; value: number }[]
	) => {
		const updates = votes.map((v) =>
			supabase
				.from("votes")
				.update({ value: v.value })
				.eq("ballot_id", ballotId)
				.eq("proposal_id", v.proposalId)
		);

		const results = await Promise.all(updates);
		const errors = results.filter((r) => r.error);

		if (errors.length) {
			alert("Some votes failed to update.");
			return false;
		}

		return true;
	};

	const deleteBallot = async (ballotId: string) => {
		const { error } = await supabase
			.from("ballots")
			.delete()
			.eq("id", ballotId);

		if (error) {
			alert(error.message);
			return false;
		}

		return true;
	};

	const submitVote = async (proposalId: string, value: number) => {
		if (!user.value) {
			alert("You must be logged in to submit votes.");
			return;
		}

		const ballotId = await getBallotId();

		if (!ballotId) {
			alert("Error creating or fetching ballot.");
			return;
		}

		const { data: existingVote, error: voteFetchError } = await supabase
			.from("votes")
			.upsert(
				{
					ballot_id: ballotId,
					proposal_id: proposalId,
					value: value,
				},
				{ onConflict: "ballot_id,proposal_id" }
			)
			.select()
			.single();

		if (voteFetchError) {
			console.error("Vote submission error:", voteFetchError);
			alert("Failed to submit vote. Please try again.");
			return;
		}

		return existingVote;
	};

	const updateVote = async (
		ballotId: string,
		proposalId: string,
		newValue: number
	) => {
		const { error } = await supabase
			.from("votes")
			.update({ value: newValue })
			.eq("ballot_id", ballotId)
			.eq("proposal_id", proposalId);

		if (error) {
			alert(error.message);
			return false;
		}

		return true;
	};

	const deleteVote = async (ballotId: string, proposalId: string) => {
		const { error } = await supabase
			.from("votes")
			.delete()
			.eq("ballot_id", ballotId)
			.eq("proposal_id", proposalId);

		if (error) {
			alert(error.message);
			return false;
		}

		return true;
	};

	const fetchProposalResults = async (vontestId: string) => {
		// Fetch proposals
		const { data: proposals, error: proposalsError } = await supabase
			.from("proposals")
			.select("id, title, description")
			.eq("vontest_id", vontestId);

		if (proposalsError) {
			console.error(proposalsError);
			return [];
		}

		// Fetch votes grouped by proposal_id with summed points
		const { data: aggregated, error: aggError } = await supabase
			.from("votes")
			.select("proposal_id, value")
			.in(
				"proposal_id",
				proposals.map((p) => p.id)
			); // get all proposal_ids' votes

		if (aggError) {
			console.error(aggError);
			return [];
		}

		// Calculate totals per proposal_id
		const totals = new Map<string, number>();
		aggregated.forEach((v) => {
			const prev = totals.get(v.proposal_id) || 0;
			totals.set(v.proposal_id, prev + v.value);
		});

		// Combine with totals
		return proposals
			.map((p) => ({
				...p,
				score: totals.get(p.id) || 0,
			}))
			.sort((a, b) => b.score - a.score);
	};

	return {
		form: { ...toRefs(form) },
		resetForm,
		fetchVotes,
		submitVote,
		fetchBallots,
		submitBallot,
		fetchProposalResults,
		deleteBallot,
		deleteVote,
		updateVote,
		updateVotes,
		fetchBallot,
		fetchUserBallot,
	};
};
