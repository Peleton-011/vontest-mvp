import type { Database } from "~/types/supabase";
import type { Ref } from "vue";

type Vontest = Database["public"]["Tables"]["vontests"]["Row"];

export const useFetchVontests = () => {
	const { data, status, error, refresh } = useAsyncData<Vontest[]>(
		"vontests", // unique key
		() => $fetch("/api/vontests"), // call server route
		{
			server: true, // fetch on server during SSR
			lazy: false, // fetch immediately on first use
			default: () => [], // fallback value until data is loaded
		}
	);

	const pending = computed(() => status.value === "pending");

	return {
		vontests: data,
		loading: pending,
		error,
		refresh,
	};
};
