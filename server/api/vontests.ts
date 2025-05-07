import { serverSupabaseClient } from '#supabase/server' // if using Nuxt Supabase module
import type { Database } from "~/types/supabase";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client.from('vontests').select('*').order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})