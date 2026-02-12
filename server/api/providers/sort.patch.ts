import { z } from 'zod'
import { readProviders } from '../../utils/providers'
import { readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const PROVIDERS_DIR = join(homedir(), '.cc-switch-web')
const PROVIDERS_FILE = join(PROVIDERS_DIR, 'providers.json')

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

  // 原子化写入
  const tmp = PROVIDERS_FILE + '.tmp'
  await writeFile(tmp, JSON.stringify(providers, null, 2), 'utf-8')
  await rename(tmp, PROVIDERS_FILE)

  return { success: true }
})
