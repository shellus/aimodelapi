import { z } from 'zod'

const providerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['claude', 'codex', 'gemini', 'opencode']).optional(),
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
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
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const result = providerUpdateSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.format()
    })
  }

  const updated = await updateProvider(id, result.data as any)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Provider not found' })
  }

  return updated
})
