import type { Database } from "~/types/supabase";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];

export const useProposals = (vontestId: string) => {
	const supabase = useSupabaseClient<Database>();

	const proposals = ref<Proposal[]>([]);
	const loading = ref(false);
	const error = ref<Error | null>(null);

	const form = reactive({
		title: "",
		description: "",
	});

	const fetchProposals = async () => {
		const { data, error: fetchError } = await supabase
			.from("proposals")
			.select("*")
			.eq("vontest_id", vontestId)
			.order("created_at", { ascending: false });

		if (!fetchError) {
			proposals.value = data || [];
		} else {
			error.value = fetchError;
		}
	};

	const submitProposal = async () => {
		loading.value = true;
		const newProposal: ProposalInsert = {
			vontest_id: vontestId,
			title: form.title,
			description: form.description,
		};

		const { error: insertError } = await supabase
			.from("proposals")
			.insert(newProposal);

		if (!insertError) {
			form.title = "";
			form.description = "";
			await fetchProposals();
		} else {
			error.value = insertError;
		}
		loading.value = false;
	};

	return {
		proposals,
		form,
		loading,
		error,
		fetchProposals,
		submitProposal,
	};
};
