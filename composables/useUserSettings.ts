import type { Database } from "~/types/supabase";

type UserSettings = {
	darkMode?: boolean;
	notifications?: {
		email: boolean;
		sms: boolean;
	};
	defaultEditor?: string;
};

type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
	settings: UserSettings;
};

const settings = ref<UserSettings | null>(null);

export const useUserSettings = () => {
	const supabase = useSupabaseClient<Database>();
	const user = useSupabaseUser();

	const fetchSettings = async () => {
		if (!user.value) return;
		const { data, error } = await supabase
			.from("profiles")
			.select("settings")
			.eq("id", user.value.id)
			.single();
		if (error) console.error(error);
		settings.value = data?.settings as UserSettings || {};
	};

	const updateSettings = async (newSettings: Partial<UserSettings>) => {
		if (!user.value) return;
		const { error } = await supabase
			.from("profiles")
			.update({ settings: { ...settings.value, ...newSettings } })
			.eq("id", user.value.id);
		if (error) console.error(error);
		else await fetchSettings();
	};

	return { settings, fetchSettings, updateSettings };
};
