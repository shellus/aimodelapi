import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import type { Provider, ProviderRequest } from '../../types'
import { writeClaudeSettings, deepMerge, type ClaudeSettings } from './claude-settings'
import { getGeneralConfig } from './general-configs'

const PROVIDERS_DIR = join(homedir(), '.aimodelapi')
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

export async function writeProviders(providers: Provider[]) {
  await ensureDir()
  await writeFile(PROVIDERS_FILE, JSON.stringify(providers, null, 2), 'utf-8')
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
    configOverrides: data.configOverrides,
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
    // 如果删除的是当前激活的 Provider，清空 settings.json
    await writeClaudeSettings({})
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

  // === 三层合并，全量写出 settings.json ===

  // Layer 2: 通用配置模板
  let settings: ClaudeSettings = {}
  if (target.generalConfigId) {
    const config = await getGeneralConfig(target.generalConfigId)
    if (config) {
      try {
        settings = JSON.parse(config.content) as ClaudeSettings
      } catch (e) {
        console.error(`[switchProvider] 通用配置 JSON 解析失败 (generalConfigId: ${target.generalConfigId}):`, e)
      }
    } else {
      console.warn(`[switchProvider] 通用配置不存在或已被删除 (generalConfigId: ${target.generalConfigId})`)
    }
  }

  // Layer 3: 用户覆写（增量 diff）
  if (target.configOverrides && Object.keys(target.configOverrides).length > 0) {
    settings = deepMerge(settings, target.configOverrides) as ClaudeSettings
  }

  // Layer 1: Provider 环境变量
  const env: Record<string, string> = {
    ANTHROPIC_AUTH_TOKEN: target.apiKey,
    ANTHROPIC_BASE_URL: target.baseUrl,
  }
  if (target.modelConfig?.model) env.ANTHROPIC_MODEL = target.modelConfig.model
  if (target.modelConfig?.thinkingModel) env.ANTHROPIC_REASONING_MODEL = target.modelConfig.thinkingModel
  if (target.modelConfig?.haikuModel) env.ANTHROPIC_DEFAULT_HAIKU_MODEL = target.modelConfig.haikuModel
  if (target.modelConfig?.sonnetModel) env.ANTHROPIC_DEFAULT_SONNET_MODEL = target.modelConfig.sonnetModel
  if (target.modelConfig?.opusModel) env.ANTHROPIC_DEFAULT_OPUS_MODEL = target.modelConfig.opusModel
  settings.env = env

  // 全量写出，不读取旧内容
  await writeClaudeSettings(settings)

  return target
}
