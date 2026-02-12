import { readProviders, createProvider } from '../../../utils/providers'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const providers = await readProviders()
  const source = providers.find(p => p.id === id)

  if (!source) {
    throw createError({ statusCode: 404, statusMessage: 'Provider not found' })
  }

  return await createProvider({
    name: `${source.name} (副本)`,
    type: source.type,
    apiKey: source.apiKey,
    baseUrl: source.baseUrl,
    websiteUrl: source.websiteUrl,
    notes: source.notes,
    icon: source.icon,
    iconColor: source.iconColor,
    generalConfigId: source.generalConfigId,
    configOverrides: source.configOverrides,
    modelConfig: source.modelConfig,
    meta: source.meta,
  })
})
