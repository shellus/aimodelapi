export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ name?: string; apiKey?: string; baseUrl?: string; model?: string }>(event)

  const updated = await updateProvider(id, body)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Provider not found' })
  }

  return updated
})
