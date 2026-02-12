import { getGeneralConfig } from '../../utils/general-configs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少配置 ID'
    })
  }

  const config = await getGeneralConfig(id)
  if (!config) {
    throw createError({
      statusCode: 404,
      statusMessage: '配置不存在'
    })
  }

  return config
})
