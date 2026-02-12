import { z } from 'zod'

const providerSchema = z.object({
  name: z.string().min(1, '名称必填'),
  type: z.enum(['claude', 'codex', 'gemini', 'opencode']),
  apiKey: z.string().min(1, 'API Key 必填'),
  baseUrl: z.string().url('请输入有效的 URL'),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  generalConfigId: z.string().optional(),
  modelConfig: z.object({
    model: z.string().optional(),
    thinkingModel: z.string().optional(),
    haikuModel: z.string().optional(),
    sonnetModel: z.string().optional(),
    opusModel: z.string().optional(),
  }).optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = providerSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.format()
    })
  }

  return await createProvider(result.data as any)
})
