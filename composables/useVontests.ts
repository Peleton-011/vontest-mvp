import type { Database } from "~/types/supabase";

type Vontest = Database["public"]["Tables"]["vontests"]["Row"];
type VontestInsert = Database["public"]["Tables"]["vontests"]["Insert"];

export const useVontests = () => {
	const supabase = useSupabaseClient<Database>();
	const { data, status, error, refresh } = useAsyncData<Vontest[]>(
		"vontests",
		() => $fetch("/api/vontests"),
		{ server: true, lazy: false, default: () => [] }
	);

	const pending = computed(() => status.value === "pending");

	const form = reactive({
		title: "",
		description: "",
	});

	const createVontest = async () => {
		const newVontest: VontestInsert = { ...form };
		const { error, data } = await supabase
			.from("vontests")
			.insert(newVontest)
			.select();

		if (!error) {
			form.title = "";
			form.description = "";
			await refresh();
			return data[0];
		} else {
			alert(error.message);
		}
	};

	return {
		vontests: data,
		loading: pending,
		error,
		refresh,
		form,
		createVontest,
	};
};
