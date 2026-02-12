export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const updated = await switchProvider(id)

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Provider not found'
    })
  }

  return updated
})
