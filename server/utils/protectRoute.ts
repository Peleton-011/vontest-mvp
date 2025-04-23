import { serverSupabaseUser } from '#supabase/server'
import { H3Event, EventHandlerRequest } from 'h3'

export default async function protectRoute(event: H3Event<EventHandlerRequest>) {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  event.context.user = user
}

/* USE:

// server/api/protected.ts
import protectRoute from '~/server/utils/protectRoute'

export default defineEventHandler(async (event) => {
  await protectRoute(event)
  return { message: 'Protected content' }
})

*/