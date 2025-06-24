import type { Database } from "~/types/supabase";

type Vontest = Database["public"]["Tables"]["vontests"]["Row"];
type VontestInsert = Database["public"]["Tables"]["vontests"]["Insert"];
type VontestUpdate = Partial<VontestInsert>;

export const useVontests = () => {
	const supabase = useSupabaseClient<Database>();
	const { data, status, error, refresh } = useAsyncData<Vontest[]>(
		"vontests",
		() => $fetch("/api/vontests"),
		{ server: true, lazy: false, default: () => [] }
	);

	const pending = computed(() => status.value === "pending");

	const form = reactive({
		id: null as string | null,
		title: "",
		description: "",
		proposalPermission: "creator" as "creator" | "all",
		votingSettings: "",
	});

	const resetForm = () => {
		form.id = null;
		form.title = "";
		form.description = "";
		form.proposalPermission = "all";
		form.votingSettings = "";
	};

	const createVontest = async () => {
		console.log(form);
		const newVontest: VontestInsert = {
			title: form.title,
			description: form.description,
		};

		const { error, data } = await supabase
			.from("vontests")
			.insert(newVontest)
			.select();

		if (!error) {
			resetForm();
			await refresh();
			return data[0];
		} else {
			alert(error.message);
		}
	};

	const updateVontest = async () => {
		if (!form.id) return;

		const updateData: VontestUpdate = {
			title: form.title,
			description: form.description,
		};

		const { error } = await supabase
			.from("vontests")
			.update(updateData)
			.eq("id", form.id);

		if (!error) {
			resetForm();
			await refresh();
		} else {
			alert(error.message);
		}
	};

	const deleteVontest = async (id: string) => {
		const { error } = await supabase.from("vontests").delete().eq("id", id);

		if (!error) {
			await refresh();
		} else {
			alert(error.message);
		}
	};

	const editVontest = (vontest: Vontest) => {
		form.id = vontest.id;
		form.title = vontest.title ?? "";
		form.description = vontest.description ?? "";
	};

	const fetchVontest = async (vontestId: string) => {
		const { data } = await supabase
			.from("vontests")
			.select("*")
			.eq("id", vontestId)
			.single();

		if (data) return data;
	};

	return {
		vontests: data,
		loading: pending,
		error,
		refresh,
		form: { ...toRefs(form) },
		createVontest,
		updateVontest,
		deleteVontest,
		fetchVontest,
		editVontest,
		resetForm,
	};
};
