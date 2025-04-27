import { createClient } from '@supabase/supabase-js';
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: { error: 'Supabase credentials are missing' } };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Authorization check (ensure the requester is an admin)
  const user = await await serverSupabaseUser(event);
  if (!user || user.role !== 'admin') {
    return { statusCode: 403, body: { error: 'Forbidden' } };
  }

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    return { statusCode: 500, body: { error: error.message } };
  }

  return { statusCode: 200, body: { users: data.users } };
});
