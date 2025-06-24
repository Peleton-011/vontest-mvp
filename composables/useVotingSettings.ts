import type { PostgrestError } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";

type VotingSettings = Database["public"]["Tables"]["voting_settings"]["Row"];
type VotingSettingsInsert =
	Database["public"]["Tables"]["voting_settings"]["Insert"];
type VotingSettingsUpdate = Partial<VotingSettingsInsert>;

export const useVotingSettings = () => {
	const supabase = useSupabaseClient<Database>();

	const settings = ref<VotingSettings>();
	const loading = ref(false);
	const error = ref<Error | null>(null);

	const fetchVotingSetting = async (settingsId: string) => {
		const { data, error } = (await supabase
			.from("voting_settings")
			.select("*")
			.eq("id", settingsId)
			.single()) as {
			data: VotingSettings;
			error: PostgrestError | null;
		};

		if (error) {
			console.error("Error fetching voting settings: ", error);
			throw error;
		}

		settings.value = data;
		return data;
	};

	const form = reactive({
		id: null as string | null,
		votingType: "single",
		allowRevoting: false,
		anonymous: false,
		resultVisibility: "public",
		votingStartAt: null as string | null,
		votingEndAt: null as string | null,
		requiresLogin: false,
		maxVotes: 1,
		minVotes: 1,
	});

	const resetForm = () => {
		form.id = null;
		form.votingType = "single";
		form.allowRevoting = false;
		form.anonymous = false;
		form.resultVisibility = "public";
		form.votingStartAt = null;
		form.votingEndAt = null;
		form.requiresLogin = false;
		form.maxVotes = 1;
		form.minVotes = 1;
	};

	const createVotingSetting = async () => {
		const newSettings: VotingSettingsInsert = {
			voting_type: form.votingType,
			allow_revoting: form.allowRevoting,
			anonymous: form.anonymous,
			result_visibility: form.resultVisibility,
			voting_start_at: form.votingStartAt,
			voting_end_at: form.votingEndAt,
			requires_login: form.requiresLogin,
			max_votes: form.maxVotes,
			min_votes: form.minVotes,
		};

		const { error, data } = await supabase
			.from("voting_settings")
			.insert(newSettings)
			.select();

		if (!error) {
			resetForm();
			return data;
		} else {
			alert(error.message);
		}
	};

	const updateVotingSetting = async () => {
		if (form.id === null) return;

		const updateData: VotingSettingsUpdate = {
			voting_type: form.votingType,
			allow_revoting: form.allowRevoting,
			anonymous: form.anonymous,
			result_visibility: form.resultVisibility,
			voting_start_at: form.votingStartAt,
			voting_end_at: form.votingEndAt,
			requires_login: form.requiresLogin,
			max_votes: form.maxVotes,
			min_votes: form.minVotes,
		};

		const { error } = await supabase
			.from("voting_settings")
			.update(updateData)
			.eq("id", form.id);

		if (!error) {
			resetForm();
		} else {
			alert(error.message);
		}
	};

	const deleteVotingSetting = async (id: string) => {
		const { error } = await supabase
			.from("voting_settings")
			.delete()
			.eq("id", id);

		if (!error) {
			return;
		} else {
			alert(error.message);
		}
	};

	const editVotingSetting = (settings: VotingSettings) => {
		form.id = settings.id;
		form.votingType = settings.voting_type;
		form.allowRevoting = settings.allow_revoting;
		form.anonymous = settings.anonymous;
		form.resultVisibility = settings.result_visibility ?? "public";
		form.votingStartAt = settings.voting_start_at;
		form.votingEndAt = settings.voting_end_at;
		form.requiresLogin = settings.requires_login;
		form.maxVotes = settings.max_votes ?? 1;
		form.minVotes = settings.min_votes ?? 1;
	};

	return {
		loading,
		error,
		form,
		createVotingSetting,
		updateVotingSetting,
		deleteVotingSetting,
		editVotingSetting,
		fetchVotingSetting,
		resetForm,
	};
};
