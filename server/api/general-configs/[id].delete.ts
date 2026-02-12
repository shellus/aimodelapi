import { deleteGeneralConfig } from '../../utils/general-configs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const success = await deleteGeneralConfig(id)
  if (!success) {
    throw createError({ statusCode: 404, statusMessage: 'Config not found' })
  }

  return { success: true }
})
