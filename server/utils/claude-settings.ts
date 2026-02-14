import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { readSettings } from './settings'

/**
 * 解析路径，支持 ~ 符号
 */
function resolvePath(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2))
  }
  return path
}

/**
 * 获取 Claude 设置文件路径
 */
async function getClaudeSettingsFile(): Promise<string> {
  const settings = await readSettings()
  const claudeDir = settings.claudeDir || '~/.claude'
  return join(resolvePath(claudeDir), 'settings.json')
}

export interface ClaudeSettings {
  env?: Record<string, string>
  [key: string]: unknown
}

export async function readClaudeSettings(): Promise<ClaudeSettings> {
  const file = await getClaudeSettingsFile()
  if (!existsSync(file)) return {}
  const raw = await readFile(file, 'utf-8')
  return JSON.parse(raw) as ClaudeSettings
}

/**
 * 全量写出 settings.json，不读取旧内容
 *
 * ⚠️ 注意：这会覆盖 settings.json 中的所有内容，包括用户手动添加的字段
 */
export async function writeClaudeSettings(settings: ClaudeSettings) {
  const file = await getClaudeSettingsFile()
  const dir = dirname(file)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(file, JSON.stringify(settings, null, 2), 'utf-8')
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
