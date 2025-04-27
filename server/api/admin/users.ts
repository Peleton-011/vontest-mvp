import { supabase } from "@/utils/supabase-admin";
import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
	// Authorization check (ensure the requester is an admin)
	const user = await serverSupabaseUser(event);
	if (!user || user.app_metadata?.role !== "admin") {
		return { statusCode: 403, body: { error: "Forbidden" } };
	}

	const { data, error } = await supabase.auth.admin.listUsers();
	if (error) {
		return { statusCode: 500, body: { error: error.message } };
	}

	return { statusCode: 200, body: { users: data.users } };
});
