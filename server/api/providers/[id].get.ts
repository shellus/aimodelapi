export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const providers = await readProviders()
  const provider = providers.find(p => p.id === id)

  if (!provider) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Provider not found'
    })
  }

  return provider
})
