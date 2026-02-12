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
