import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const CODEX_DIR = join(homedir(), '.codex')
const AUTH_FILE = join(CODEX_DIR, 'auth.json')
const CONFIG_FILE = join(CODEX_DIR, 'config.toml')

async function ensureCodexDir() {
  if (!existsSync(CODEX_DIR)) {
    await mkdir(CODEX_DIR, { recursive: true })
  }
}

/**
 * 读取 Codex auth.json
 */
export async function readCodexAuth(): Promise<Record<string, any>> {
  await ensureCodexDir()
  if (!existsSync(AUTH_FILE)) return {}
  const raw = await readFile(AUTH_FILE, 'utf-8')
  return JSON.parse(raw)
}

/**
 * 写入 Codex auth.json
 */
export async function writeCodexAuth(auth: Record<string, any>) {
  await ensureCodexDir()
  await writeFile(AUTH_FILE, JSON.stringify(auth, null, 2), 'utf-8')
}

/**
 * 读取 Codex config.toml
 */
export async function readCodexConfig(): Promise<string> {
  await ensureCodexDir()
  if (!existsSync(CONFIG_FILE)) return ''
  return await readFile(CONFIG_FILE, 'utf-8')
}

/**
 * 写入 Codex config.toml
 */
export async function writeCodexConfig(config: string) {
  await ensureCodexDir()
  await writeFile(CONFIG_FILE, config, 'utf-8')
}

/**
 * 生成第三方供应商的 auth.json
 */
export function generateCodexAuth(apiKey: string): Record<string, any> {
  return {
    OPENAI_API_KEY: apiKey || '',
  }
}

/**
 * 生成第三方供应商的 config.toml
 */
export function generateCodexConfig(
  providerName: string,
  baseUrl: string,
  modelName = 'gpt-5.3-codex',
  reasoningEffort = 'high',
): string {
  // 清理供应商名称，确保符合 TOML 键名规范
  const cleanProviderName = providerName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '') || 'custom'

  return `model_provider = "${cleanProviderName}"
model = "${modelName}"
model_reasoning_effort = "${reasoningEffort}"
disable_response_storage = true

[model_providers.${cleanProviderName}]
name = "${cleanProviderName}"
base_url = "${baseUrl}"
wire_api = "responses"
requires_openai_auth = true`
}

/**
 * 从 TOML 中提取 base_url
 */
export function extractCodexBaseUrl(toml: string): string {
  if (!toml) return ''
  const match = toml.match(/base_url\s*=\s*"([^"]+)"/)
  return match ? match[1] : ''
}

/**
 * 在 TOML 中设置 base_url
 */
export function setCodexBaseUrl(toml: string, baseUrl: string): string {
  if (!toml) {
    return `model_provider = "custom"
model = "gpt-5.3-codex"
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.custom]
name = "custom"
base_url = "${baseUrl}"
wire_api = "responses"
requires_openai_auth = true`
  }

  let nextToml = toml
  const providerNameMatch = nextToml.match(/^model_provider\s*=\s*"([^"]+)"/m)
  const providerName = providerNameMatch ? providerNameMatch[1] : 'custom'

  // 保证 model_provider 存在，并位于 model 之前
  if (!providerNameMatch) {
    if (nextToml.match(/^model\s*=/m)) {
      nextToml = nextToml.replace(/^model\s*=.*$/m, `model_provider = "${providerName}"\n$&`)
    } else {
      nextToml = `model_provider = "${providerName}"\n${nextToml}`
    }
  }

  // 如果已存在 base_url，替换它
  if (nextToml.includes('base_url')) {
    nextToml = nextToml.replace(/base_url\s*=\s*"[^"]*"/, `base_url = "${baseUrl}"`)
  } else {
    // 如果不存在，添加到 [model_providers.xxx] 部分之后
    const providerSectionMatch = nextToml.match(/(\[model_providers\.[^\]]+\][^\[]*)/s)
    if (providerSectionMatch) {
      const section = providerSectionMatch[1]
      const updatedSection = section.trimEnd() + `\nbase_url = "${baseUrl}"`
      nextToml = nextToml.replace(providerSectionMatch[1], updatedSection)
    } else {
      nextToml = `${nextToml.trimEnd()}\n\n[model_providers.${providerName}]\nname = "${providerName}"\nbase_url = "${baseUrl}"\nwire_api = "responses"\nrequires_openai_auth = true`
    }
  }

  // 保证当前 provider section 存在 name 字段
  const escapedProviderName = providerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const providerBlockRegex = new RegExp(`(\\[model_providers\\.${escapedProviderName}\\][\\s\\S]*?)(?=\\n\\[|$)`)
  const providerBlockMatch = nextToml.match(providerBlockRegex)
  if (providerBlockMatch && !/^name\s*=\s*"[^"]*"/m.test(providerBlockMatch[1])) {
    const updatedBlock = providerBlockMatch[1].replace(
      new RegExp(`^\\[model_providers\\.${escapedProviderName}\\]`, 'm'),
      `[model_providers.${providerName}]\nname = "${providerName}"`,
    )
    nextToml = nextToml.replace(providerBlockRegex, updatedBlock)
  }

  return nextToml
}

/**
 * 从 TOML 中提取 model
 */
export function extractCodexModelName(toml: string): string {
  if (!toml) return ''
  const match = toml.match(/^model\s*=\s*"([^"]+)"/m)
  return match ? match[1] : ''
}

/**
 * 在 TOML 中设置 model
 */
export function setCodexModelName(toml: string, modelName: string): string {
  if (!toml) {
    return `model_provider = "custom"\nmodel = "${modelName}"`
  }

  let nextToml = toml
  const providerNameMatch = nextToml.match(/^model_provider\s*=\s*"([^"]+)"/m)
  if (!providerNameMatch) {
    if (nextToml.match(/^model\s*=/m)) {
      nextToml = nextToml.replace(/^model\s*=.*$/m, 'model_provider = "custom"\n$&')
    } else {
      nextToml = `model_provider = "custom"\n${nextToml}`
    }
  }

  // 如果已存在 model，替换它
  if (nextToml.match(/^model\s*=/m)) {
    return nextToml.replace(/^model\s*=\s*"[^"]*"/m, `model = "${modelName}"`)
  }

  // 如果不存在，添加到 model_provider 之后
  if (nextToml.match(/^model_provider\s*=/m)) {
    return nextToml.replace(/^(model_provider\s*=\s*"[^"]*")/m, `$1\nmodel = "${modelName}"`)
  }

  return `model_provider = "custom"\nmodel = "${modelName}"\n${nextToml}`
}

/**
 * 从 TOML 中提取 model_reasoning_effort
 */
export function extractCodexReasoningEffort(toml: string): string {
  if (!toml) return ''
  const match = toml.match(/model_reasoning_effort\s*=\s*"([^"]+)"/)
  return match ? match[1] : ''
}

/**
 * 在 TOML 中设置 model_reasoning_effort
 */
export function setCodexReasoningEffort(toml: string, effort: string): string {
  if (!toml) return toml

  // 如果已存在 model_reasoning_effort，替换它
  if (toml.includes('model_reasoning_effort')) {
    return toml.replace(/model_reasoning_effort\s*=\s*"[^"]*"/, `model_reasoning_effort = "${effort}"`)
  }

  // 如果不存在，添加到 model 之后
  if (toml.match(/^model\s*=/m)) {
    return toml.replace(/^(model\s*=\s*"[^"]*")/m, `$1\nmodel_reasoning_effort = "${effort}"`)
  }

  return toml
}

/**
 * 简单的 TOML 格式验证
 */
export function validateToml(toml: string): { valid: boolean; error?: string } {
  if (!toml.trim()) {
    return { valid: true }
  }

  try {
    // 检查基本的 TOML 语法
    const lines = toml.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 跳过空行和注释
      if (!line || line.startsWith('#')) continue

      // 检查 section 格式
      if (line.startsWith('[')) {
        if (!line.endsWith(']')) {
          return { valid: false, error: `第 ${i + 1} 行：section 格式错误，缺少闭合括号` }
        }
        continue
      }

      // 检查键值对格式
      if (line.includes('=')) {
        const parts = line.split('=')
        if (parts.length < 2) {
          return { valid: false, error: `第 ${i + 1} 行：键值对格式错误` }
        }

        const key = parts[0].trim()
        const value = parts.slice(1).join('=').trim()

        if (!key) {
          return { valid: false, error: `第 ${i + 1} 行：键名不能为空` }
        }

        // 检查字符串值是否有引号
        if (value.startsWith('"') && !value.endsWith('"')) {
          return { valid: false, error: `第 ${i + 1} 行：字符串值缺少闭合引号` }
        }

        continue
      }

      // 其他非空行可能是格式错误
      return { valid: false, error: `第 ${i + 1} 行：无法识别的格式` }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: `TOML 解析错误: ${error}` }
  }
}
