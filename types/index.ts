/**
 * Provider 应用类型
 */
export type ProviderAppType = 'claude' | 'codex' | 'gemini' | 'opencode'

/**
 * Provider 数据模型
 */
export interface Provider {
  id: string
  name: string
  type: ProviderAppType          // 应用类型（claude/codex/gemini/opencode）

  // 配置信息
  apiKey: string
  baseUrl: string
  websiteUrl?: string

  // 模型配置（Claude 专用）
  modelConfig?: ClaudeModelConfig

  // Codex 配置（Codex 专用）
  codexConfig?: CodexConfig

  // 元数据
  notes?: string                 // 备注信息
  icon?: string                  // 图标名称
  iconColor?: string             // 图标颜色（Hex 格式）

  // 状态信息
  isCurrent: boolean             // 是否为当前激活的 Provider
  generalConfigId?: string       // 关联的通用配置模板 ID
  configOverrides?: Record<string, any>  // Layer 4: 用户手动覆写（增量 diff）
  inFailoverQueue?: boolean      // 是否加入故障转移队列

  // 时间戳
  createdAt: number              // 创建时间戳（毫秒）
  sortIndex?: number             // 排序索引（用于拖拽排序）

  // 扩展信息
  meta?: ProviderMeta            // 元数据（不写入 settings.json）
}

/**
 * Claude 模型配置
 */
export interface ClaudeModelConfig {
  model?: string
  thinkingModel?: string
  haikuModel?: string
  sonnetModel?: string
  opusModel?: string
}

/**
 * Codex 配置
 * config.toml 是最终配置，包含所有设置（model, base_url, reasoning_effort 等）
 */
export interface CodexConfig {
  auth: Record<string, any>      // auth.json 内容
  config: string                  // config.toml 内容（TOML 字符串）- 这是最终配置
}

/**
 * Provider 扩展元数据
 */
export interface ProviderMeta {
  [key: string]: any
}

/**
 * 通用配置模板
 */
export interface GeneralConfig {
  id: string
  name: string
  type: 'claude' | 'codex'  // 配置类型
  content: string // JSON 字符串
  createdAt: number
}

/**
 * 应用配置
 */
export interface AppConfig {
  providers: Record<string, Provider>
  current: string  // 当前 Provider ID
}

/**
 * Claude Settings.json 结构
 */
export interface ClaudeSettings {
  env?: Record<string, string>
  includeCoAuthoredBy?: boolean
  [key: string]: any
}

/**
 * Provider 列表响应
 */
export interface ProvidersResponse {
  providers: Provider[]
  current?: string
}

/**
 * Provider 创建/更新请求
 */
export interface ProviderRequest {
  name: string
  type: ProviderAppType
  apiKey: string
  baseUrl: string
  websiteUrl?: string
  notes?: string
  icon?: string
  iconColor?: string
  generalConfigId?: string
  configOverrides?: Record<string, any>
  modelConfig?: ClaudeModelConfig
  codexConfig?: CodexConfig
  meta?: ProviderMeta
}
