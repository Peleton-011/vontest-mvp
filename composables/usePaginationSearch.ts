import { ref, computed, watch, type Ref } from "vue";
import { useDebounce } from "@vueuse/core"; // Assumes you're using VueUse (recommended)

export function usePaginationSearch<T extends object>(
	source: Ref<T[]>,
	pageSize = 6,
	searchKeys?: (keyof T)[]
) {
	const rawQuery = ref("");
	const debouncedQuery = useDebounce(rawQuery, 250); // Debounce for smoother typing
	const currentPage = ref(1);

	// Reset pagination whenever the query changes
	watch(debouncedQuery, () => {
		currentPage.value = 1;
	});

	const filteredItems = computed(() => {
		const query = debouncedQuery.value.toLowerCase();
		if (!query) return source.value;

		return source.value.filter((item) => {
			const keys = searchKeys || (Object.keys(item) as (keyof T)[]);
			return keys.some((key) => {
				const val = item[key];
				return String(val ?? "").toLowerCase().includes(query);
			});
		});
	});

	const paginatedItems = computed(() => {
		const start = (currentPage.value - 1) * pageSize;
		const end = start + pageSize;
		return filteredItems.value.slice(start, end);
	});

	const totalPages = computed(() =>
		Math.ceil(filteredItems.value.length / pageSize)
	);

	const goToNextPage = () => {
		if (currentPage.value < totalPages.value) currentPage.value++;
	};

	const goToPrevPage = () => {
		if (currentPage.value > 1) currentPage.value--;
	};

	return {
		searchQuery: rawQuery,
		currentPage,
		totalPages,
		paginatedItems,
		filteredItems,
		goToNextPage,
		goToPrevPage,
	};
}
