import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import type { Provider, ProviderRequest } from '../../types'
import { writeClaudeEnv, clearClaudeEnv, applyGeneralConfigContent } from './claude-settings'
import { getGeneralConfig } from './general-configs'

const PROVIDERS_DIR = join(homedir(), '.cc-switch-web')
const PROVIDERS_FILE = join(PROVIDERS_DIR, 'providers.json')

async function ensureDir() {
  if (!existsSync(PROVIDERS_DIR)) {
    await mkdir(PROVIDERS_DIR, { recursive: true })
  }
}

export async function readProviders(): Promise<Provider[]> {
  await ensureDir()
  if (!existsSync(PROVIDERS_FILE)) return []
  const raw = await readFile(PROVIDERS_FILE, 'utf-8')
  return JSON.parse(raw) as Provider[]
}

async function writeProviders(providers: Provider[]) {
  await ensureDir()
  const tmp = PROVIDERS_FILE + '.tmp'
  await writeFile(tmp, JSON.stringify(providers, null, 2), 'utf-8')
  await rename(tmp, PROVIDERS_FILE)
}

export async function createProvider(data: ProviderRequest): Promise<Provider> {
  const providers = await readProviders()
  const provider: Provider = {
    id: randomUUID().slice(0, 8),
    name: data.name,
    type: data.type,
    apiKey: data.apiKey,
    baseUrl: data.baseUrl,
    websiteUrl: data.websiteUrl,
    modelConfig: data.modelConfig,
    notes: data.notes,
    icon: data.icon,
    iconColor: data.iconColor,
    generalConfigId: data.generalConfigId,
    meta: data.meta,
    isCurrent: false,
    createdAt: Date.now(),
  }
  providers.push(provider)
  await writeProviders(providers)
  return provider
}

export async function updateProvider(id: string, data: Partial<ProviderRequest>): Promise<Provider | null> {
  const providers = await readProviders()
  const idx = providers.findIndex(p => p.id === id)
  if (idx === -1) return null

  // 保留原有不可修改字段，更新请求字段
  const updated = {
    ...providers[idx],
    ...data,
  }
  providers[idx] = updated

  await writeProviders(providers)
  return providers[idx]
}

export async function deleteProvider(id: string): Promise<boolean> {
  const providers = await readProviders()
  const idx = providers.findIndex(p => p.id === id)
  if (idx === -1) return false
  if (providers[idx].isCurrent) {
    // 如果删除的是当前激活的 Provider，清除 claude settings 中的 env
    await clearClaudeEnv()
  }
  providers.splice(idx, 1)
  await writeProviders(providers)
  return true
}

export async function switchProvider(id: string): Promise<Provider | null> {
  const providers = await readProviders()
  const target = providers.find(p => p.id === id)
  if (!target) return null

  // 取消所有 isCurrent
  for (const p of providers) p.isCurrent = false
  target.isCurrent = true

  await writeProviders(providers)

  // 1. 如果有关联的通用配置，先应用模板（带环境变量保护）
  if (target.generalConfigId) {
    const config = await getGeneralConfig(target.generalConfigId)
    if (config) {
      await applyGeneralConfigContent(config.content)
    }
  }

  // 2. 写入当前 Provider 的环境变量
  const env: Record<string, string> = {
    ANTHROPIC_AUTH_TOKEN: target.apiKey,
    ANTHROPIC_BASE_URL: target.baseUrl,
  }

  // 优先从 modelConfig 获取主模型
  if (target.modelConfig?.model) {
    env.ANTHROPIC_MODEL = target.modelConfig.model
  }

  await writeClaudeEnv(env)

  return target
}
