import { z } from 'zod'
import { saveGeneralConfig } from '../../utils/general-configs'

const configSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '名称不能为空'),
  content: z.string().min(1, '配置内容不能为空').refine((val) => {
    try {
      JSON.parse(val)
      return true
    } catch (e) {
      return false
    }
  }, '配置内容必须是有效的 JSON 格式')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = configSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.format()
    })
  }

  // 强制设置 type 为 codex
  return await saveGeneralConfig({
    ...result.data,
    type: 'codex'
  })
})
