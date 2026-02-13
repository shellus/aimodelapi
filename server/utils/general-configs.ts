import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import type { GeneralConfig } from '../../types'

const CONFIG_DIR = join(homedir(), '.aimodelapi')
const CONFIG_FILE = join(CONFIG_DIR, 'general-configs.json')

/**
 * 确保配置目录存在
 */
async function ensureDir() {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true })
  }
}

/**
 * 读取所有通用配置
 */
export async function readGeneralConfigs(): Promise<GeneralConfig[]> {
  if (!existsSync(CONFIG_FILE)) return []
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(raw) as GeneralConfig[]
  } catch (error) {
    console.error('Failed to read general-configs.json:', error)
    return []
  }
}

/**
 * 写入通用配置列表
 */
async function writeGeneralConfigs(configs: GeneralConfig[]) {
  await ensureDir()
  await writeFile(CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf-8')
}

/**
 * 保存或更新通用配置
 */
export async function saveGeneralConfig(data: Omit<GeneralConfig, 'id' | 'createdAt'> & { id?: string }): Promise<GeneralConfig> {
  const configs = await readGeneralConfigs()

  if (data.id) {
    // 更新
    const idx = configs.findIndex(c => c.id === data.id)
    if (idx !== -1) {
      configs[idx] = {
        ...configs[idx],
        name: data.name,
        content: data.content
      }
      await writeGeneralConfigs(configs)
      return configs[idx]
    }
  }

  // 新增
  const newConfig: GeneralConfig = {
    id: randomUUID().slice(0, 8),
    name: data.name,
    content: data.content,
    createdAt: Date.now()
  }
  configs.push(newConfig)
  await writeGeneralConfigs(configs)
  return newConfig
}

/**
 * 删除通用配置
 */
export async function deleteGeneralConfig(id: string): Promise<boolean> {
  const configs = await readGeneralConfigs()
  const filtered = configs.filter(c => c.id !== id)
  if (filtered.length === configs.length) return false

  await writeGeneralConfigs(filtered)
  return true
}

/**
 * 获取单个通用配置
 */
export async function getGeneralConfig(id: string): Promise<GeneralConfig | null> {
  const configs = await readGeneralConfigs()
  return configs.find(c => c.id === id) || null
}
