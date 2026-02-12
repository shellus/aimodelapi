export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const provider = await switchProvider(id)
  if (!provider) {
    throw createError({ statusCode: 404, statusMessage: 'Provider not found' })
  }

  return provider
})
