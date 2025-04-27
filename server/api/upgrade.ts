import { serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, readBody } from "h3";
import { supabase } from "@/utils/supabase-admin"; // Adjust the path accordingly

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const { userId, role } = body; // Add role to the request body

	// Get the authenticated user from the request (using the current session or auth token)
	const user = await serverSupabaseUser(event);

	if (!user) {
		return {
			statusCode: 401,
			body: { error: "Unauthorized. Please log in." },
		};
	}

	// Check if the user has an admin role
	const userRole = user.user_metadata?.role;
	if (userRole !== "admin") {
		return {
			statusCode: 403,
			body: { error: "Forbidden. Only admins can perform this action." },
		};
	}

	if (!userId || !role) {
		return {
			statusCode: 400,
			body: { error: "User ID and role are required" },
		};
	}

	// Update user_metadata to change the role to admin or any other role
	const { data, error } = await supabase.auth.admin.updateUserById(userId, {
		user_metadata: { role: role },
	});

	if (error) {
		return {
			statusCode: 403,
			body: { error: error.message },
		};
	}

	return {
		statusCode: 200,
		body: { data },
	};
});
