import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'

export interface Provider {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  model?: string
  isCurrent: boolean
  createdAt: number
}

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

export async function createProvider(data: Pick<Provider, 'name' | 'apiKey' | 'baseUrl' | 'model'>): Promise<Provider> {
  const providers = await readProviders()
  const provider: Provider = {
    id: randomUUID().slice(0, 8),
    name: data.name,
    apiKey: data.apiKey,
    baseUrl: data.baseUrl,
    model: data.model || undefined,
    isCurrent: false,
    createdAt: Date.now(),
  }
  providers.push(provider)
  await writeProviders(providers)
  return provider
}

export async function updateProvider(id: string, data: Partial<Pick<Provider, 'name' | 'apiKey' | 'baseUrl' | 'model'>>): Promise<Provider | null> {
  const providers = await readProviders()
  const idx = providers.findIndex(p => p.id === id)
  if (idx === -1) return null
  Object.assign(providers[idx], data)
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

  // 写入 claude settings
  await writeClaudeEnv({
    ANTHROPIC_AUTH_TOKEN: target.apiKey,
    ANTHROPIC_BASE_URL: target.baseUrl,
    ...(target.model ? { ANTHROPIC_MODEL: target.model } : {}),
  })

  return target
}
