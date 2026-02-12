export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const deleted = await deleteProvider(id)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Provider not found' })
  }

  return { success: true }
})
