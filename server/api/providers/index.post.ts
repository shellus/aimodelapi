export default defineEventHandler(async (event) => {
  const body = await readBody<{ name: string; apiKey: string; baseUrl: string; model?: string }>(event)

  if (!body.name || !body.apiKey || !body.baseUrl) {
    throw createError({ statusCode: 400, statusMessage: 'name, apiKey, baseUrl are required' })
  }

  return await createProvider(body)
})
