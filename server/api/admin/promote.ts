import { serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, readBody } from "h3";
import { supabase } from "@/utils/supabase-admin"; // Adjust the path accordingly

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { userId, role } = body; // Role to promote the user to (e.g., 'admin')

  // Get the authenticated user from the request (using the current session or auth token)
  const user = await serverSupabaseUser(event);

  if (!user) {
    return {
      statusCode: 401,
      body: { error: "Unauthorized. Please log in." },
    };
  }

  // Check if the user has an admin role
  const userRole = user.app_metadata?.role;
  if (userRole !== "admin") {
    return {
      statusCode: 403,
      body: { error: "Forbidden. Only admins can perform this action." },
    };
  }

  // Validate userId and role
  if (!userId || !role) {
    return {
      statusCode: 400,
      body: { error: "User ID and role are required" },
    };
  }

  // Ensure that the role is valid before proceeding
  if (role !== "admin" && role !== "user") {
    return {
      statusCode: 400,
      body: { error: "Invalid role. Only 'admin' and 'user' are allowed." },
    };
  }

  try {
    // Check if the user is already an admin
    const { data: existingUser, error: userFetchError } = await supabase.auth.admin.getUserById(userId);

    if (userFetchError) {
      return {
        statusCode: 500,
        body: { error: "Failed to fetch user data. " + userFetchError.message },
      };
    }

    if (existingUser?.user?.app_metadata?.role === "admin" && role === "admin") {
      return {
        statusCode: 400,
        body: { error: "User is already an admin." },
      };
    }

    console.log(existingUser.user.app_metadata);

    // Update user_metadata to change the role to admin or another role
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });

    if (error) {
      return {
        statusCode: 500,
        body: { error: "Failed to update user role: " + error.message },
      };
    }

    return {
      statusCode: 200,
      body: { data },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: { error: "An unexpected error occurred: " + (err as Error).message },
    };
  }
});
