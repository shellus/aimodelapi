import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

const SETTINGS_FILE = join(homedir(), '.aimodelapi', 'settings.json')

export interface AppSettings {
  postSwitchHook?: string
}

export async function readSettings(): Promise<AppSettings> {
  if (!existsSync(SETTINGS_FILE)) return {}
  try {
    const raw = await readFile(SETTINGS_FILE, 'utf-8')
    return JSON.parse(raw) as AppSettings
  } catch {
    return {}
  }
}

export async function writeSettings(settings: AppSettings): Promise<void> {
  const dir = dirname(SETTINGS_FILE)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}
