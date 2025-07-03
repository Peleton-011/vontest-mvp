import type { Database } from "~/types/supabase";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];
type ProposalUpdate = Partial<ProposalInsert>;


export const useProposals = (vontestId: string) => {
    const { submitThread } = useThread();
	const supabase = useSupabaseClient<Database>();

	const proposals = ref<Proposal[]>([]);
	const loading = ref(false);
	const error = ref<Error | null>(null);

	const form = reactive({
		id: null as string | null,
		title: "",
		description: "",
	});

	const resetForm = () => {
		form.id = null;
		form.title = "";
		form.description = "";
	};

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

	const fetchProposal = async (proposalId: string) => {
		const { data } = await supabase
			.from("proposals")
			.select("*")
			.eq("id", proposalId)
			.single();

		if (data) return data;
	};

	const submitProposal = async () => {
		loading.value = true;

		const newProposal: ProposalInsert = {
			vontest_id: vontestId,
			title: form.title,
			description: form.description,
		};

		const { data, error: insertError } = await supabase
			.from("proposals")
			.insert(newProposal)
			.select();

		loading.value = false;

		if (insertError) {
			error.value = insertError;
			throw insertError;
		}
		resetForm();
		await fetchProposals();

        //Make a thread for the proposal
		submitThread({
			type: "proposal",
			referenceId: data?.[0].id ?? "",
		});

		return data?.[0];
	};

	const updateProposal = async () => {
		if (!form.id) return;

		loading.value = true;

		const updateData: ProposalUpdate = {
			title: form.title,
			description: form.description,
		};

		const { error: updateError } = await supabase
			.from("proposals")
			.update(updateData)
			.eq("id", form.id);

		loading.value = false;

		if (!updateError) {
			resetForm();
			await fetchProposals();
		} else {
			error.value = updateError;
		}
	};

	const deleteProposal = async (id: string) => {
		const { error: deleteError } = await supabase
			.from("proposals")
			.delete()
			.eq("id", id);

		if (!deleteError) {
			await fetchProposals();
		} else {
			error.value = deleteError;
		}
	};

	const editProposal = (proposal: Proposal) => {
		form.id = proposal.id;
		form.title = proposal.title ?? "";
		form.description = proposal.description ?? "";
	};

	return {
		proposals,
		form: { ...toRefs(form) },
		loading,
		error,
		fetchProposals,
		fetchProposal,
		submitProposal,
		updateProposal,
		deleteProposal,
		editProposal,
		resetForm,
	};
};
