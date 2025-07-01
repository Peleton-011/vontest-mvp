import type { Database } from "~/types/supabase";

type Ballot = Database["public"]["Tables"]["ballots"]["Row"];
type BallotInsert = Database["public"]["Tables"]["ballots"]["Insert"];
type Vote = Database["public"]["Tables"]["votes"]["Row"];
type VoteInsert = Database["public"]["Tables"]["votes"]["Insert"];

export const useVoting = () => {
	const supabase = useSupabaseClient<Database>();

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
			alert("Please select proposals and assign values before submitting.");
			return;
		}

		// Start transaction (simulate since Supabase doesn't support multi-table transactions natively)
		const { data: ballot, error: ballotError } = await supabase
			.from("ballots")
			.insert({
				vontest_id: form.vontestId,
			} as BallotInsert)
			.select()
			.single();

		if (ballotError) {
			alert(ballotError.message);
			return;
		}

		const votesToInsert: VoteInsert[] = form.votes.map((v) => ({
			ballot_id: ballot.id,
			proposal_id: v.proposalId,
			value: v.value,
		}));

		const { error: votesError } = await supabase
			.from("votes")
			.insert(votesToInsert);

		if (votesError) {
			alert(votesError.message);
			// Optionally delete ballot here to revert if votes insertion fails
			return;
		}

		resetForm();
		return ballot;
	};

	return {
		form: { ...toRefs(form) },
		resetForm,
		fetchBallots,
		fetchVotes,
		submitBallot,
	};
};
