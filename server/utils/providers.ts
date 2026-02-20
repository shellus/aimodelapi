import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import type { Provider, ProviderRequest } from '../../types'
import { writeClaudeSettings, deepMerge, type ClaudeSettings } from './claude-settings'
import { writeCodexAuth, writeCodexConfig, generateCodexConfig, setCodexBaseUrl } from './codex-settings'
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
    codexConfig: data.codexConfig,
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
    // 如果删除的是当前激活的 Provider，根据类型清空配置文件
    const providerType = providers[idx].type
    if (providerType === 'claude') {
      await writeClaudeSettings({})
    } else if (providerType === 'codex') {
      await writeCodexAuth({})
      await writeCodexConfig('')
    }
  }
  providers.splice(idx, 1)
  await writeProviders(providers)
  return true
}

export async function switchProvider(id: string): Promise<Provider | null> {
  const providers = await readProviders()
  const target = providers.find(p => p.id === id)
  if (!target) return null

  // 取消所有同类型的 isCurrent
  for (const p of providers) {
    if (p.type === target.type) {
      p.isCurrent = false
    }
  }
  target.isCurrent = true

  await writeProviders(providers)

  // 根据应用类型写入不同的配置文件
  if (target.type === 'claude') {
    await switchClaudeProvider(target)
  } else if (target.type === 'codex') {
    await switchCodexProvider(target)
  }

  return target
}

/**
 * 切换 Claude Provider
 */
async function switchClaudeProvider(target: Provider) {
  // === 统一四层框架（Claude 的 L3 当前为空）===
  // 最终写出 settings.json

  // Layer 2: 通用配置模板
  let settings: ClaudeSettings = {}
  if (target.generalConfigId) {
    const config = await getGeneralConfig(target.generalConfigId)
    if (config) {
      try {
        settings = JSON.parse(config.content) as ClaudeSettings
      } catch (e) {
        console.error(`[switchClaudeProvider] 通用配置 JSON 解析失败 (generalConfigId: ${target.generalConfigId}):`, e)
      }
    } else {
      console.warn(`[switchClaudeProvider] 通用配置不存在或已被删除 (generalConfigId: ${target.generalConfigId})`)
    }
  }

  // Layer 4: 用户覆写（增量 diff）
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
}

/**
 * 切换 Codex Provider
 */
async function switchCodexProvider(target: Provider) {
  // === 四层合并，全量写出 auth.json 和 config.toml ===

  // Layer 2: 通用配置模板
  let templateAuth: Record<string, any> = {}
  let templateConfig = ''

  if (target.generalConfigId) {
    const config = await getGeneralConfig(target.generalConfigId)
    if (config) {
      try {
        const template = JSON.parse(config.content)
        templateAuth = template.auth || {}
        templateConfig = template.config || ''
      } catch (e) {
        console.error(`[switchCodexProvider] 通用配置 JSON 解析失败 (generalConfigId: ${target.generalConfigId}):`, e)
      }
    } else {
      console.warn(`[switchCodexProvider] 通用配置不存在或已被删除 (generalConfigId: ${target.generalConfigId})`)
    }
  }

  // Layer 3: Provider 自身配置（优先级更高）
  let finalAuth = { ...templateAuth }
  let finalConfig = templateConfig

  if (target.codexConfig) {
    // 合并 auth（L2 优先）
    if (target.codexConfig.auth && Object.keys(target.codexConfig.auth).length > 0) {
      finalAuth = { ...templateAuth, ...target.codexConfig.auth }
    }

    // 合并 config（L2 优先）
    if (target.codexConfig.config) {
      // 如果 L2 有 config，需要合并 L1 和 L2 的 TOML
      if (templateConfig) {
        // 简单策略：L2 的顶层字段覆盖 L1，L2 的 sections 覆盖 L1 的同名 sections
        finalConfig = mergeTomlConfigs(templateConfig, target.codexConfig.config)
      } else {
        finalConfig = target.codexConfig.config
      }
    }
  }

  // Layer 1: 基础字段（来自 Provider 表单）
  finalAuth.OPENAI_API_KEY = target.apiKey

  // 如果仍为空，先生成默认结构，再覆盖 base_url
  if (!finalConfig) {
    finalConfig = generateCodexConfig(
      target.name,
      target.baseUrl,
      'gpt-5.3-codex',
      'high'
    )
  }
  finalConfig = setCodexBaseUrl(finalConfig, target.baseUrl)

  // Layer 4: 最终编辑器 diff（configOverrides）
  const codexAuthOverride = target.configOverrides?.codexAuth
  if (codexAuthOverride && typeof codexAuthOverride === 'object' && !Array.isArray(codexAuthOverride)) {
    finalAuth = deepMerge(finalAuth, codexAuthOverride)
  }
  const codexConfigOverride = target.configOverrides?.codexConfig
  if (typeof codexConfigOverride === 'string' && codexConfigOverride.trim()) {
    finalConfig = codexConfigOverride
  }
  // 基础字段优先：最终再覆盖一次 base_url，避免被 overrides 覆盖
  finalConfig = setCodexBaseUrl(finalConfig, target.baseUrl)

  await writeCodexAuth(finalAuth)
  await writeCodexConfig(finalConfig)
}

/**
 * 合并两个 TOML 配置字符串
 * L2 的字段优先覆盖 L1 的同名字段
 */
function mergeTomlConfigs(l1: string, l2: string): string {
  if (!l1) return l2
  if (!l2) return l1

  // 解析 L1 和 L2 的行
  const l1Lines = l1.split('\n')
  const l2Lines = l2.split('\n')

  // 提取 L2 的顶层字段（在第一个 section 之前）
  const l2TopLevelKeys = new Set<string>()
  for (const line of l2Lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[')) break // 遇到 section 就停止
    if (!trimmed || trimmed.startsWith('#')) continue

    const keyMatch = trimmed.match(/^([^=]+)=/)
    if (keyMatch) {
      l2TopLevelKeys.add(keyMatch[1].trim())
    }
  }

  // 提取 L2 的 sections
  const l2Sections = new Set<string>()
  for (const line of l2Lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[')) {
      const sectionMatch = trimmed.match(/^\[([^\]]+)\]/)
      if (sectionMatch) {
        l2Sections.add(sectionMatch[1])
      }
    }
  }

  // 过滤 L1：移除被 L2 覆盖的顶层字段和 sections
  const filteredL1Lines: string[] = []
  let currentSection: string | null = null
  let skipCurrentSection = false

  for (const line of l1Lines) {
    const trimmed = line.trim()

    // 检查是否是 section 开始
    if (trimmed.startsWith('[')) {
      const sectionMatch = trimmed.match(/^\[([^\]]+)\]/)
      if (sectionMatch) {
        currentSection = sectionMatch[1]
        skipCurrentSection = l2Sections.has(currentSection)
      }

      if (!skipCurrentSection) {
        filteredL1Lines.push(line)
      }
      continue
    }

    // 如果在被跳过的 section 中，跳过这一行
    if (skipCurrentSection) continue

    // 如果是顶层字段（不在任何 section 中）
    if (!currentSection) {
      if (!trimmed || trimmed.startsWith('#')) {
        filteredL1Lines.push(line)
        continue
      }

      const keyMatch = trimmed.match(/^([^=]+)=/)
      if (keyMatch) {
        const key = keyMatch[1].trim()
        // 如果 L2 中没有这个字段，保留
        if (!l2TopLevelKeys.has(key)) {
          filteredL1Lines.push(line)
        }
      } else {
        filteredL1Lines.push(line)
      }
    } else {
      // 在 section 中，且 section 没有被跳过
      filteredL1Lines.push(line)
    }
  }

  // 合并：L2 + 过滤后的 L1
  return l2 + '\n' + filteredL1Lines.join('\n')
}
