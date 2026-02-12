import { z } from 'zod'
import { readProviders, writeProviders } from '../../utils/providers'

const SortUpdateSchema = z.array(
  z.object({
    id: z.string(),
    sortIndex: z.number(),
  })
)

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // 校验请求体
  const updates = SortUpdateSchema.parse(body)

  // 读取现有 Providers
  const providers = await readProviders()

  // 更新 sortIndex
  const updateMap = new Map(updates.map(u => [u.id, u.sortIndex]))
  for (const provider of providers) {
    if (updateMap.has(provider.id)) {
      provider.sortIndex = updateMap.get(provider.id)
    }
  }

  // 写入（复用 providers.ts 的原子化写入）
  await writeProviders(providers)

  return { success: true }
})
