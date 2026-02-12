import { getGeneralConfig } from '../../../utils/general-configs'
import { applyGeneralConfigContent } from '../../../utils/claude-settings'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const config = await getGeneralConfig(id)
  if (!config) {
    throw createError({ statusCode: 404, statusMessage: 'Config not found' })
  }

  try {
    await applyGeneralConfigContent(config.content)
    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || '应用配置失败'
    })
  }
})
