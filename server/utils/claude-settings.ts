import { readFile, writeFile, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const CLAUDE_SETTINGS_FILE = join(homedir(), '.claude', 'settings.json')

interface ClaudeSettings {
  env?: Record<string, string>
  [key: string]: unknown
}

export async function readClaudeSettings(): Promise<ClaudeSettings> {
  if (!existsSync(CLAUDE_SETTINGS_FILE)) return {}
  const raw = await readFile(CLAUDE_SETTINGS_FILE, 'utf-8')
  return JSON.parse(raw) as ClaudeSettings
}

async function writeClaudeSettings(settings: ClaudeSettings) {
  const tmp = CLAUDE_SETTINGS_FILE + '.tmp'
  await writeFile(tmp, JSON.stringify(settings, null, 2), 'utf-8')
  await rename(tmp, CLAUDE_SETTINGS_FILE)
}

const ENV_KEYS = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_MODEL'] as const

export async function writeClaudeEnv(env: Record<string, string>) {
  const settings = await readClaudeSettings()
  if (!settings.env) settings.env = {}

  // 先清除旧的相关键
  for (const key of ENV_KEYS) {
    delete settings.env[key]
  }

  // 写入新值
  Object.assign(settings.env, env)

  await writeClaudeSettings(settings)
}

/**
 * 简单的深合并函数
 */
export function deepMerge(target: any, source: any) {
  if (!source || typeof source !== 'object') return target
  if (!target || typeof target !== 'object') return source

  const result = { ...target }
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

/**
 * 应用通用配置内容（带环境变量保护）
 */
export async function applyGeneralConfigContent(content: string) {
  const current = await readClaudeSettings()

  // 1. 强制保留当前的环境变量（由 Provider 管理器维护）
  const oldEnv = current.env ? { ...current.env } : undefined

  // 2. 解析新配置
  let newConfigData: any
  try {
    newConfigData = JSON.parse(content)
  } catch (e) {
    throw new Error('无效的 JSON 配置内容')
  }

  // 3. 执行深合并
  const mergedSettings = deepMerge(current, newConfigData)

  // 4. 强制还原环境变量
  if (oldEnv) {
    mergedSettings.env = oldEnv
  } else {
    delete mergedSettings.env
  }

  // 5. 写入系统配置
  await writeClaudeSettings(mergedSettings)
  return mergedSettings
}

export async function clearClaudeEnv() {
  const settings = await readClaudeSettings()
  if (!settings.env) return

  for (const key of ENV_KEYS) {
    delete settings.env[key]
  }

  // 如果 env 为空对象，删除 env 键
  if (Object.keys(settings.env).length === 0) {
    delete settings.env
  }

  await writeClaudeSettings(settings)
}

export async function getClaudeEnvStatus(): Promise<Record<string, string | undefined>> {
  const settings = await readClaudeSettings()
  const env = settings.env || {}
  return {
    ANTHROPIC_AUTH_TOKEN: env.ANTHROPIC_AUTH_TOKEN,
    ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL,
    ANTHROPIC_MODEL: env.ANTHROPIC_MODEL,
  }
}

/**
 * 提取两个对象之间的增量差异
 * 返回 edited 中与 base 不同的键值（新增或修改的）
 */
export function extractDiff(base: any, edited: any): Record<string, any> {
  const diff: Record<string, any> = {}

  for (const key in edited) {
    if (!(key in base)) {
      // 新增的键
      diff[key] = edited[key]
    } else if (
      edited[key] && typeof edited[key] === 'object' && !Array.isArray(edited[key]) &&
      base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])
    ) {
      // 嵌套对象：递归比较
      const nestedDiff = extractDiff(base[key], edited[key])
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff
      }
    } else if (JSON.stringify(base[key]) !== JSON.stringify(edited[key])) {
      // 值不同
      diff[key] = edited[key]
    }
  }

  return diff
}
