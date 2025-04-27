import { serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, readBody } from 'h3'
import { supabase } from '@/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { userId } = body // User ID to demote

  // Get the authenticated user from the request
  const user = await serverSupabaseUser(event)

  if (!user) {
    return {
      statusCode: 401,
      body: { error: 'Unauthorized. Please log in.' },
    }
  }

  // Check if the user has an admin role
  const userRole = user.app_metadata?.role
  if (userRole !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Forbidden. Only admins can perform this action.' },
    }
  }

  if (!userId) {
    return {
      statusCode: 400,
      body: { error: 'User ID is required' },
    }
  }

  try {
    // Fetch the user to check their current role
    const { data: existingUser, error: userFetchError } = await supabase.auth.admin.getUserById(userId)

    if (userFetchError) {
      return {
        statusCode: 500,
        body: { error: 'Failed to fetch user data. ' + userFetchError.message },
      }
    }

    if (existingUser?.user?.app_metadata?.role !== 'admin') {
      return {
        statusCode: 400,
        body: { error: 'User is not an admin.' },
      }
    }

    // Update user_metadata to change the role to 'user'
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { role: 'user' },
    })

    if (error) {
      return {
        statusCode: 500,
        body: { error: 'Failed to update user role: ' + error.message },
      }
    }

    return {
      statusCode: 200,
      body: { data },
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: { error: 'An unexpected error occurred: ' + (err as Error).message },
    }
  }
})
